import {
  InjectQueue,
  OnWorkerEvent,
  Processor,
  WorkerHost,
} from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';

import { Job, Queue, UnrecoverableError } from 'bullmq';

import { StorageService } from '@/common/storage/storage.service';
import { MeetingRepository } from '@/modules/meetings/repositories/meeting.repository';
import {
  MEDIA_METADATA_DEAD_LETTER_QUEUE,
  MEDIA_METADATA_QUEUE,
  type DeadLetteredMediaMetadataJob,
  type MediaMetadataJob,
} from '@/queue/queues';

import {
  MediaProbeError,
  MediaProbeService,
} from '../services/media-probe.service';

/**
 * What a run decided, recorded on the job so the queue itself explains what
 * happened without cross-referencing logs.
 */
export type MediaMetadataOutcome =
  | 'probed'
  | 'already-probed'
  | 'meeting-gone'
  | 'claimed-elsewhere'
  | 'superseded';

export interface MediaMetadataResult {
  outcome: MediaMetadataOutcome;
  durationSec?: number;
}

/**
 * Reads the duration of an uploaded recording and walks the meeting from
 * UPLOADED to READY.
 *
 * Nothing here assumes it runs once. A queue promises *at least* once, so
 * every step is written to be safe when the same meeting arrives twice: the
 * result is checked before any work, the claim is a conditional UPDATE, and
 * the write back is guarded on the status the claim left behind.
 */
@Processor(MEDIA_METADATA_QUEUE, { concurrency: 2 })
export class MediaMetadataProcessor extends WorkerHost {
  private readonly logger = new Logger(MediaMetadataProcessor.name);

  constructor(
    private readonly meetingRepository: MeetingRepository,
    private readonly storageService: StorageService,
    private readonly mediaProbeService: MediaProbeService,
    @InjectQueue(MEDIA_METADATA_DEAD_LETTER_QUEUE)
    private readonly deadLetterQueue: Queue<DeadLetteredMediaMetadataJob>,
  ) {
    super();
  }

  async process(job: Job<MediaMetadataJob>): Promise<MediaMetadataResult> {
    const { meetingId } = job.data;
    const meeting = await this.meetingRepository.findById(meetingId);

    if (!meeting) {
      // Deleted between upload and probe. Not a failure — there is simply
      // nothing left to describe.
      this.logger.log(`Meeting ${meetingId} no longer exists, dropping job`);
      return { outcome: 'meeting-gone' };
    }

    if (meeting.durationSec !== null) {
      // The whole point of the job is already true. This is the common
      // duplicate-delivery case and it must be free.
      return { outcome: 'already-probed', durationSec: meeting.durationSec };
    }

    // A retry of a job that already held the claim is allowed to take it back;
    // a first attempt is not, or two workers would probe the same file.
    const resuming = job.attemptsMade > 0;
    const claimed = await this.meetingRepository.claimForProcessing(
      meetingId,
      resuming,
    );

    if (!claimed) {
      this.logger.log(
        `Meeting ${meetingId} is not claimable (status ${meeting.status}), leaving it alone`,
      );
      return { outcome: 'claimed-elsewhere' };
    }

    const durationSec = await this.probe(meetingId, meeting.storageKey);

    const recorded = await this.meetingRepository.recordProbedMetadata(
      meetingId,
      durationSec,
    );

    if (!recorded) {
      // Something moved the meeting on while we were probing. Its state is
      // newer than ours, so we do not write over it.
      this.logger.warn(
        `Meeting ${meetingId} moved on while probing, discarding duration ${durationSec}s`,
      );
      return { outcome: 'superseded', durationSec };
    }

    this.logger.log(`Meeting ${meetingId} is READY, duration ${durationSec}s`);
    return { outcome: 'probed', durationSec };
  }

  /**
   * Probe the stored file, translating "no point retrying" into the error
   * BullMQ understands as final and releasing the claim when a retry could
   * still work.
   */
  private async probe(meetingId: string, storageKey: string): Promise<number> {
    if (!(await this.storageService.exists(storageKey))) {
      throw new UnrecoverableError(
        `stored file ${storageKey} is missing — nothing to probe`,
      );
    }

    const startedAt = Date.now();

    try {
      const durationSec = await this.mediaProbeService.durationSec(
        this.storageService.localPath(storageKey),
      );

      this.logger.log(
        `Probed meeting ${meetingId} in ${Date.now() - startedAt}ms`,
      );

      return durationSec;
    } catch (error) {
      if (error instanceof MediaProbeError && error.permanent) {
        throw new UnrecoverableError(error.message);
      }

      // Retryable: hand the meeting back so the next attempt gets a clean
      // claim rather than having to resume a half-finished one.
      await this.meetingRepository.releaseClaim(meetingId);
      throw error;
    }
  }

  /**
   * Last stop for a job that will not be tried again: the meeting is marked
   * FAILED and a summary goes to the dead-letter queue, where it can be read
   * and replayed by hand.
   */
  @OnWorkerEvent('failed')
  async onFailed(job: Job<MediaMetadataJob> | undefined, error: Error) {
    if (!job || !this.isFinalFailure(job, error)) {
      return;
    }

    const { meetingId } = job.data;

    this.logger.error(
      `Giving up on meeting ${meetingId} after ${job.attemptsMade} attempt(s): ${error.message}`,
    );

    await this.meetingRepository.markFailed(meetingId);

    await this.deadLetterQueue.add('dead-letter', {
      meetingId,
      reason: error.message,
      attemptsMade: job.attemptsMade,
      retriesExhausted: !(error instanceof UnrecoverableError),
      failedAt: new Date().toISOString(),
    });
  }

  /**
   * A failure is final either because retrying is pointless (the processor
   * said so by throwing UnrecoverableError) or because there are no attempts
   * left. Every other failure is on its way back into the queue.
   */
  private isFinalFailure(job: Job<MediaMetadataJob>, error: Error): boolean {
    return (
      error instanceof UnrecoverableError ||
      job.attemptsMade >= (job.opts.attempts ?? 1)
    );
  }
}
