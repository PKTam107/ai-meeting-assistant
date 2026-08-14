import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/database/prisma.service';

import { MeetingStatus } from '../../../../generated/prisma/client';

import type { Meeting, Prisma } from '../../../../generated/prisma/client';

export interface CreateMeetingData {
  workspaceId: string;
  uploadedById: string;
  title: string;
  description?: string;
  storageKey: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
}

/** A meeting joined with the status of its async AI artifacts. */
export type MeetingWithArtifacts = Prisma.MeetingGetPayload<{
  include: {
    transcript: { select: { id: true; status: true } };
    summary: { select: { id: true; status: true } };
    _count: { select: { actionItems: true } };
  };
}>;

@Injectable()
export class MeetingRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateMeetingData): Promise<Meeting> {
    return this.prisma.meeting.create({ data });
  }

  findById(id: string): Promise<Meeting | null> {
    return this.prisma.meeting.findUnique({ where: { id } });
  }

  findByIdWithArtifacts(id: string): Promise<MeetingWithArtifacts | null> {
    return this.prisma.meeting.findUnique({
      where: { id },
      include: {
        transcript: { select: { id: true, status: true } },
        summary: { select: { id: true, status: true } },
        _count: { select: { actionItems: true } },
      },
    });
  }

  listByWorkspace(workspaceId: string): Promise<Meeting[]> {
    return this.prisma.meeting.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  update(
    id: string,
    data: { title?: string; description?: string; status?: MeetingStatus },
  ): Promise<Meeting> {
    return this.prisma.meeting.update({ where: { id }, data });
  }

  /**
   * Move a meeting into PROCESSING, reporting whether this caller is the one
   * that moved it.
   *
   * A queue delivers at least once, so the same meeting can be handed to two
   * workers. Reading the status and then writing it would let both believe
   * they own the job; the guard in the WHERE clause is what makes ownership
   * exclusive, the same shape as spending a refresh token.
   *
   * `resuming` is for a retry of a job that already held the claim and then
   * died — without it, a worker killed mid-probe would leave the meeting
   * parked in PROCESSING that nothing can ever claim again. A first attempt
   * never takes a meeting another worker is holding.
   */
  async claimForProcessing(id: string, resuming = false): Promise<boolean> {
    const claimable = resuming
      ? [MeetingStatus.UPLOADED, MeetingStatus.PROCESSING]
      : [MeetingStatus.UPLOADED];

    const { count } = await this.prisma.meeting.updateMany({
      where: { id, status: { in: claimable } },
      data: { status: MeetingStatus.PROCESSING },
    });

    return count > 0;
  }

  /**
   * Hand a claimed meeting back after a failure that is worth retrying, so the
   * next attempt can claim it normally instead of having to resume.
   */
  async releaseClaim(id: string): Promise<boolean> {
    const { count } = await this.prisma.meeting.updateMany({
      where: { id, status: MeetingStatus.PROCESSING },
      data: { status: MeetingStatus.UPLOADED },
    });

    return count > 0;
  }

  /**
   * Record what the probe found. Guarded on PROCESSING so a late job that lost
   * its claim — or one arriving after the meeting has already been transcribed
   * — cannot drag the status backwards.
   */
  async recordProbedMetadata(
    id: string,
    durationSec: number,
  ): Promise<boolean> {
    const { count } = await this.prisma.meeting.updateMany({
      where: { id, status: MeetingStatus.PROCESSING },
      data: { durationSec, status: MeetingStatus.READY },
    });

    return count > 0;
  }

  /**
   * Give up on a meeting. Only a meeting still in the early stages is failed:
   * once it has a transcript, a late metadata failure is not a reason to mark
   * the whole meeting broken.
   */
  async markFailed(id: string): Promise<boolean> {
    const { count } = await this.prisma.meeting.updateMany({
      where: {
        id,
        status: { in: [MeetingStatus.UPLOADED, MeetingStatus.PROCESSING] },
      },
      data: { status: MeetingStatus.FAILED },
    });

    return count > 0;
  }

  delete(id: string): Promise<Meeting> {
    return this.prisma.meeting.delete({ where: { id } });
  }
}
