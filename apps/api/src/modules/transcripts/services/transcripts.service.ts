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
   * Request transcription for a meeting. For now this only records the PENDING
   * intent; the actual AI transcription (e.g. Whisper) will be performed by a
   * background worker that consumes PENDING rows.
   */
  async transcribe(meetingId: string, userId: string): Promise<Transcript> {
    await this.meetingsService.loadAccessible(meetingId, userId);
    // TODO(ai): enqueue a BullMQ transcription job here once the worker exists.
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
