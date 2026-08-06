import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { AuthUser } from '@/modules/auth/interfaces/auth-user.interface';

import { ActionItemsService } from '../services/action-items.service';
import { CreateActionItemDto } from '../dto/create-action-item.dto';

/**
 * Action items nested under a meeting (list + create).
 * Prefix ('meetings/:meetingId/action-items') is assigned in app.routes.ts.
 */
@UseGuards(JwtAuthGuard)
@Controller()
export class MeetingActionItemsController {
  constructor(private readonly actionItemsService: ActionItemsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Param('meetingId') meetingId: string) {
    return this.actionItemsService.listForMeeting(meetingId, user.userId);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Param('meetingId') meetingId: string,
    @Body() dto: CreateActionItemDto,
  ) {
    return this.actionItemsService.create(meetingId, user.userId, dto);
  }
}
