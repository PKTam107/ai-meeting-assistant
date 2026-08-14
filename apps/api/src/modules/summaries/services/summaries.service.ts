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
   * Request a summary for a meeting. Records the PENDING intent only: the worker
   * process exists and runs jobs, but no summarization job type has been written
   * yet, so nothing consumes the row.
   */
  async summarize(meetingId: string, userId: string): Promise<Summary> {
    await this.meetingsService.loadAccessible(meetingId, userId);
    // TODO(ai): enqueue a summarization job on the queue the worker already
    // consumes. It depends on the transcript, so it is a two-step chain.
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
