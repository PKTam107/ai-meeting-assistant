import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { AuthUser } from '@/modules/auth/interfaces/auth-user.interface';

import { MeetingsService } from '../services/meetings.service';
import { CreateMeetingDto } from '../dto/create-meeting.dto';

/** Memory-storage safety cap (2 GiB); the configurable per-file limit is
 * enforced precisely in MeetingsService.validateFile. */
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024;

/**
 * Meeting routes scoped to a workspace: upload and list.
 * Prefix ('workspaces/:workspaceId/meetings') is assigned in app.routes.ts.
 */
@UseGuards(JwtAuthGuard)
@Controller()
export class WorkspaceMeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }),
  )
  create(
    @CurrentUser() user: AuthUser,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateMeetingDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.meetingsService.create(workspaceId, user.userId, dto, file);
  }

  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.meetingsService.findAllForWorkspace(workspaceId, user.userId);
  }
}
