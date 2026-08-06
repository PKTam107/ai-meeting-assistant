import { Injectable, NotFoundException } from '@nestjs/common';

import { MeetingsService } from '@/modules/meetings/services/meetings.service';

import { SummaryRepository } from '../repositories/summary.repository';

import type { Summary } from '../../../../generated/prisma/client';

@Injectable()
export class SummariesService {
  constructor(
    private readonly summaryRepository: SummaryRepository,
    private readonly meetingsService: MeetingsService,
  ) {}

  /**
   * Request a summary for a meeting. Records the PENDING intent only; the LLM
   * summarization runs later in a background worker over the transcript.
   */
  async summarize(meetingId: string, userId: string): Promise<Summary> {
    await this.meetingsService.loadAccessible(meetingId, userId);
    // TODO(ai): enqueue a BullMQ summarization job here once the worker exists.
    return this.summaryRepository.enqueue(meetingId);
  }

  async getForMeeting(meetingId: string, userId: string): Promise<Summary> {
    await this.meetingsService.loadAccessible(meetingId, userId);

    const summary = await this.summaryRepository.findByMeetingId(meetingId);
    if (!summary) {
      throw new NotFoundException('Summary has not been requested yet');
    }
    return summary;
  }
}
