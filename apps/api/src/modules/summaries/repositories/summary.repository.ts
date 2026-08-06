import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/database/prisma.service';

import type { Summary } from '../../../../generated/prisma/client';

@Injectable()
export class SummaryRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByMeetingId(meetingId: string): Promise<Summary | null> {
    return this.prisma.summary.findUnique({ where: { meetingId } });
  }

  /**
   * Queue (or re-queue) summarization. An AI worker (wired later) consumes
   * PENDING rows, reads the meeting transcript, and fills in `content`.
   */
  enqueue(meetingId: string): Promise<Summary> {
    return this.prisma.summary.upsert({
      where: { meetingId },
      create: { meetingId, status: 'PENDING' },
      update: { status: 'PENDING', content: null, error: null },
    });
  }
}
