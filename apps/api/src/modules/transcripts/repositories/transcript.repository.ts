import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/database/prisma.service';

import type { Transcript } from '../../../../generated/prisma/client';

@Injectable()
export class TranscriptRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByMeetingId(meetingId: string): Promise<Transcript | null> {
    return this.prisma.transcript.findUnique({ where: { meetingId } });
  }

  /**
   * Queue (or re-queue) transcription: create the row in PENDING, or reset an
   * existing one back to PENDING and clear the previous result/error. An AI
   * worker (wired later) picks PENDING rows up and fills in text/segments.
   */
  enqueue(meetingId: string): Promise<Transcript> {
    return this.prisma.transcript.upsert({
      where: { meetingId },
      create: { meetingId, status: 'PENDING' },
      update: { status: 'PENDING', text: null, error: null },
    });
  }
}
