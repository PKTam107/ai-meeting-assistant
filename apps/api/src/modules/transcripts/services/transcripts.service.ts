import { Injectable, NotFoundException } from '@nestjs/common';

import { MeetingsService } from '@/modules/meetings/services/meetings.service';

import { TranscriptRepository } from '../repositories/transcript.repository';

import type { Transcript } from '../../../../generated/prisma/client';

@Injectable()
export class TranscriptsService {
  constructor(
    private readonly transcriptRepository: TranscriptRepository,
    private readonly meetingsService: MeetingsService,
  ) {}

  /**
   * Request transcription for a meeting. This only records the PENDING intent:
   * the worker process exists and runs jobs, but no transcription job type has
   * been written yet, so nothing consumes the row.
   */
  async transcribe(meetingId: string, userId: string): Promise<Transcript> {
    await this.meetingsService.loadAccessible(meetingId, userId);
    // TODO(ai): enqueue a transcription job on the queue the worker already
    // consumes — see src/queue/queues.ts for the media-metadata job it models.
    return this.transcriptRepository.enqueue(meetingId);
  }

  async getForMeeting(meetingId: string, userId: string): Promise<Transcript> {
    await this.meetingsService.loadAccessible(meetingId, userId);

    const transcript =
      await this.transcriptRepository.findByMeetingId(meetingId);
    if (!transcript) {
      throw new NotFoundException('Transcript has not been requested yet');
    }
    return transcript;
  }
}
