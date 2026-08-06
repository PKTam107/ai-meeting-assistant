import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { MeetingsService } from '@/modules/meetings/services/meetings.service';
import { WorkspacesService } from '@/modules/workspaces/services/workspaces.service';

import {
  ActionItemRepository,
  UpdateActionItemData,
} from '../repositories/action-item.repository';
import { CreateActionItemDto } from '../dto/create-action-item.dto';
import { UpdateActionItemDto } from '../dto/update-action-item.dto';

import type { ActionItem } from '../../../../generated/prisma/client';

@Injectable()
export class ActionItemsService {
  constructor(
    private readonly actionItemRepository: ActionItemRepository,
    private readonly meetingsService: MeetingsService,
    private readonly workspacesService: WorkspacesService,
  ) {}

  async listForMeeting(
    meetingId: string,
    userId: string,
  ): Promise<ActionItem[]> {
    await this.meetingsService.loadAccessible(meetingId, userId);
    return this.actionItemRepository.listByMeeting(meetingId);
  }

  async create(
    meetingId: string,
    userId: string,
    dto: CreateActionItemDto,
  ): Promise<ActionItem> {
    const meeting = await this.meetingsService.loadAccessible(
      meetingId,
      userId,
    );
    await this.assertAssigneeIsMember(meeting.workspaceId, dto.assigneeId);

    return this.actionItemRepository.create({
      meetingId,
      content: dto.content,
      assigneeId: dto.assigneeId,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      status: dto.status,
    });
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateActionItemDto,
  ): Promise<ActionItem> {
    const meeting = await this.loadAccessibleMeetingFor(id, userId);

    if (dto.assigneeId) {
      await this.assertAssigneeIsMember(meeting.workspaceId, dto.assigneeId);
    }

    const data: UpdateActionItemData = {
      content: dto.content,
      status: dto.status,
      assigneeId: dto.assigneeId,
      dueDate:
        dto.dueDate === undefined
          ? undefined
          : dto.dueDate === null
            ? null
            : new Date(dto.dueDate),
    };

    return this.actionItemRepository.update(id, data);
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.loadAccessibleMeetingFor(id, userId);
    await this.actionItemRepository.delete(id);
  }

  /** Load the action item, then gate on access to its parent meeting. */
  private async loadAccessibleMeetingFor(id: string, userId: string) {
    const actionItem = await this.actionItemRepository.findById(id);
    if (!actionItem) {
      throw new NotFoundException('Action item not found');
    }
    return this.meetingsService.loadAccessible(actionItem.meetingId, userId);
  }

  private async assertAssigneeIsMember(
    workspaceId: string,
    assigneeId: string | null | undefined,
  ): Promise<void> {
    if (!assigneeId) {
      return;
    }
    if (!(await this.workspacesService.isMember(workspaceId, assigneeId))) {
      throw new BadRequestException(
        'Assignee must be a member of the workspace',
      );
    }
  }
}
