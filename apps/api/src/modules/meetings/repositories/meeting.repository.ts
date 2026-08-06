import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/database/prisma.service';

import type {
  Meeting,
  MeetingStatus,
  Prisma,
} from '../../../../generated/prisma/client';

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

  delete(id: string): Promise<Meeting> {
    return this.prisma.meeting.delete({ where: { id } });
  }
}
