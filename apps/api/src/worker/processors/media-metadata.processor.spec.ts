import { getQueueToken } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { Job, Queue, UnrecoverableError } from 'bullmq';

import { StorageService } from '@/common/storage/storage.service';
import { MeetingRepository } from '@/modules/meetings/repositories/meeting.repository';
import {
  MEDIA_METADATA_DEAD_LETTER_QUEUE,
  type MediaMetadataJob,
} from '@/queue/queues';

import {
  MediaProbeError,
  MediaProbeService,
} from '../services/media-probe.service';
import { MediaMetadataProcessor } from './media-metadata.processor';

/**
 * The contract this processor has to keep is not "reads a duration" — that is
 * one line. It is what happens around the read, because a queue delivers *at
 * least* once and the process can die at any point:
 *
 *   - the same meeting arriving twice must not be probed twice
 *   - two workers must never both own the same meeting
 *   - a retry of our own crashed job must be able to continue
 *   - broken input must not be retried, and a broken environment must be
 *   - a meeting is only marked FAILED when nothing will be tried again
 */
describe('MediaMetadataProcessor', () => {
  const MEETING_ID = 'meeting-1';
  const STORAGE_KEY = 'meetings/ws-1/file.mp4';

  const meeting = (overrides: Record<string, unknown> = {}) => ({
    id: MEETING_ID,
    storageKey: STORAGE_KEY,
    status: 'UPLOADED',
    durationSec: null,
    ...overrides,
  });

  const jobFor = (overrides: Partial<Job<MediaMetadataJob>> = {}) =>
    ({
      data: { meetingId: MEETING_ID },
      attemptsMade: 0,
      opts: { attempts: 3 },
      ...overrides,
    }) as unknown as Job<MediaMetadataJob>;

  beforeAll(() => {
    // The give-up path logs at ERROR by design; without this a passing run
    // prints two red lines that look like the suite failed.
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  let processor: MediaMetadataProcessor;
  let meetings: jest.Mocked<MeetingRepository>;
  let storage: jest.Mocked<StorageService>;
  let probe: jest.Mocked<MediaProbeService>;
  let deadLetterQueue: jest.Mocked<Queue>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        MediaMetadataProcessor,
        {
          provide: MeetingRepository,
          useValue: {
            findById: jest.fn().mockResolvedValue(meeting()),
            claimForProcessing: jest.fn().mockResolvedValue(true),
            releaseClaim: jest.fn().mockResolvedValue(true),
            recordProbedMetadata: jest.fn().mockResolvedValue(true),
            markFailed: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: StorageService,
          useValue: {
            exists: jest.fn().mockResolvedValue(true),
            localPath: jest.fn().mockReturnValue(`/storage/${STORAGE_KEY}`),
          },
        },
        {
          provide: MediaProbeService,
          useValue: { durationSec: jest.fn().mockResolvedValue(1_800) },
        },
        {
          provide: getQueueToken(MEDIA_METADATA_DEAD_LETTER_QUEUE),
          useValue: { add: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    processor = moduleRef.get(MediaMetadataProcessor);
    meetings = moduleRef.get(MeetingRepository);
    storage = moduleRef.get(StorageService);
    probe = moduleRef.get(MediaProbeService);
    deadLetterQueue = moduleRef.get(
      getQueueToken(MEDIA_METADATA_DEAD_LETTER_QUEUE),
    );
  });

  describe('process', () => {
    it('probes the file and moves the meeting to READY', async () => {
      const result = await processor.process(jobFor());

      expect(meetings.claimForProcessing).toHaveBeenCalledWith(
        MEETING_ID,
        false,
      );
      expect(probe.durationSec).toHaveBeenCalledWith(`/storage/${STORAGE_KEY}`);
      expect(meetings.recordProbedMetadata).toHaveBeenCalledWith(
        MEETING_ID,
        1_800,
      );
      expect(result).toEqual({ outcome: 'probed', durationSec: 1_800 });
    });

    it('does no work when the meeting already carries a duration', async () => {
      meetings.findById.mockResolvedValue(
        meeting({ status: 'READY', durationSec: 1_800 }) as never,
      );

      const result = await processor.process(jobFor());

      // The duplicate delivery every at-least-once queue eventually produces.
      // It has to be free, not merely harmless.
      expect(meetings.claimForProcessing).not.toHaveBeenCalled();
      expect(probe.durationSec).not.toHaveBeenCalled();
      expect(result).toEqual({ outcome: 'already-probed', durationSec: 1_800 });
    });

    it('drops the job when the meeting is gone', async () => {
      meetings.findById.mockResolvedValue(null);

      const result = await processor.process(jobFor());

      expect(result).toEqual({ outcome: 'meeting-gone' });
      expect(probe.durationSec).not.toHaveBeenCalled();
    });

    it('backs off when another worker holds the claim', async () => {
      meetings.claimForProcessing.mockResolvedValue(false);

      const result = await processor.process(jobFor());

      expect(result).toEqual({ outcome: 'claimed-elsewhere' });
      expect(probe.durationSec).not.toHaveBeenCalled();
    });

    it('lets a retry resume a claim its own earlier attempt left behind', async () => {
      meetings.findById.mockResolvedValue(
        meeting({ status: 'PROCESSING' }) as never,
      );

      await processor.process(jobFor({ attemptsMade: 1 }));

      // Without this, a worker killed mid-probe parks the meeting in
      // PROCESSING and no later attempt can ever claim it again.
      expect(meetings.claimForProcessing).toHaveBeenCalledWith(
        MEETING_ID,
        true,
      );
    });

    it('discards its result if the meeting moved on while probing', async () => {
      meetings.recordProbedMetadata.mockResolvedValue(false);

      const result = await processor.process(jobFor());

      expect(result).toEqual({ outcome: 'superseded', durationSec: 1_800 });
    });

    it('refuses to retry a file that is not there', async () => {
      storage.exists.mockResolvedValue(false);

      await expect(processor.process(jobFor())).rejects.toBeInstanceOf(
        UnrecoverableError,
      );
      expect(probe.durationSec).not.toHaveBeenCalled();
    });

    it('refuses to retry input ffprobe rejected', async () => {
      probe.durationSec.mockRejectedValue(
        new MediaProbeError('ffprobe rejected the file', true),
      );

      await expect(processor.process(jobFor())).rejects.toBeInstanceOf(
        UnrecoverableError,
      );
      // A permanent failure keeps the claim: the meeting is on its way to
      // FAILED, not back into the queue.
      expect(meetings.releaseClaim).not.toHaveBeenCalled();
    });

    it('releases the claim and retries when the failure is ours, not the file’s', async () => {
      const missingBinary = new MediaProbeError('ffprobe not found', false);
      probe.durationSec.mockRejectedValue(missingBinary);

      await expect(processor.process(jobFor())).rejects.toBe(missingBinary);

      expect(meetings.releaseClaim).toHaveBeenCalledWith(MEETING_ID);
      // Not UnrecoverableError: installing ffmpeg is all it would take.
      await expect(processor.process(jobFor())).rejects.not.toBeInstanceOf(
        UnrecoverableError,
      );
    });
  });

  describe('on failure', () => {
    it('keeps quiet while attempts remain', async () => {
      await processor.onFailed(
        jobFor({ attemptsMade: 1 }),
        new Error('redis hiccup'),
      );

      expect(meetings.markFailed).not.toHaveBeenCalled();
      expect(deadLetterQueue.add).not.toHaveBeenCalled();
    });

    it('fails the meeting and dead-letters the job once retries run out', async () => {
      await processor.onFailed(
        jobFor({ attemptsMade: 3 }),
        new Error('ffprobe not found'),
      );

      expect(meetings.markFailed).toHaveBeenCalledWith(MEETING_ID);
      expect(deadLetterQueue.add).toHaveBeenCalledWith(
        'dead-letter',
        expect.objectContaining({
          meetingId: MEETING_ID,
          reason: 'ffprobe not found',
          attemptsMade: 3,
          retriesExhausted: true,
        }),
      );
    });

    it('dead-letters a permanent failure immediately, with its attempts unspent', async () => {
      await processor.onFailed(
        jobFor({ attemptsMade: 1 }),
        new UnrecoverableError('stored file is missing'),
      );

      expect(meetings.markFailed).toHaveBeenCalledWith(MEETING_ID);
      expect(deadLetterQueue.add).toHaveBeenCalledWith(
        'dead-letter',
        expect.objectContaining({ retriesExhausted: false }),
      );
    });
  });
});
