import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { AuthUser } from '@/modules/auth/interfaces/auth-user.interface';

import { SummariesService } from '../services/summaries.service';

// Prefix ('meetings/:meetingId/summary') is assigned in app.routes.ts.
@UseGuards(JwtAuthGuard)
@Controller()
export class SummariesController {
  constructor(private readonly summariesService: SummariesService) {}

  /** Request (or re-request) a summary for the meeting. */
  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  summarize(
    @CurrentUser() user: AuthUser,
    @Param('meetingId') meetingId: string,
  ) {
    return this.summariesService.summarize(meetingId, user.userId);
  }

  @Get()
  get(@CurrentUser() user: AuthUser, @Param('meetingId') meetingId: string) {
    return this.summariesService.getForMeeting(meetingId, user.userId);
  }
}
