import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/database/prisma.service';

import type {
  ActionItem,
  ActionItemStatus,
} from '../../../../generated/prisma/client';

export interface CreateActionItemData {
  meetingId: string;
  content: string;
  assigneeId?: string | null;
  dueDate?: Date | null;
  status?: ActionItemStatus;
}

export interface UpdateActionItemData {
  content?: string;
  assigneeId?: string | null;
  dueDate?: Date | null;
  status?: ActionItemStatus;
}

@Injectable()
export class ActionItemRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<ActionItem | null> {
    return this.prisma.actionItem.findUnique({ where: { id } });
  }

  listByMeeting(meetingId: string): Promise<ActionItem[]> {
    return this.prisma.actionItem.findMany({
      where: { meetingId },
      orderBy: { createdAt: 'asc' },
    });
  }

  create(data: CreateActionItemData): Promise<ActionItem> {
    return this.prisma.actionItem.create({ data });
  }

  update(id: string, data: UpdateActionItemData): Promise<ActionItem> {
    return this.prisma.actionItem.update({ where: { id }, data });
  }

  delete(id: string): Promise<ActionItem> {
    return this.prisma.actionItem.delete({ where: { id } });
  }
}
