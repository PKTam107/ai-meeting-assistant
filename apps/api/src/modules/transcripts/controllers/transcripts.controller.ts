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

import { TranscriptsService } from '../services/transcripts.service';

// Prefix ('meetings/:meetingId/transcript') is assigned in app.routes.ts.
@UseGuards(JwtAuthGuard)
@Controller()
export class TranscriptsController {
  constructor(private readonly transcriptsService: TranscriptsService) {}

  /** Request (or re-request) transcription for the meeting. */
  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  transcribe(
    @CurrentUser() user: AuthUser,
    @Param('meetingId') meetingId: string,
  ) {
    return this.transcriptsService.transcribe(meetingId, user.userId);
  }

  @Get()
  get(@CurrentUser() user: AuthUser, @Param('meetingId') meetingId: string) {
    return this.transcriptsService.getForMeeting(meetingId, user.userId);
  }
}
