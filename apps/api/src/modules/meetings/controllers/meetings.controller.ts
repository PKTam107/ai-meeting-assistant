import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Body,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';

import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { AuthUser } from '@/modules/auth/interfaces/auth-user.interface';

import { MeetingsService } from '../services/meetings.service';
import { UpdateMeetingDto } from '../dto/update-meeting.dto';

/**
 * Routes addressing a single meeting by id.
 * Prefix ('meetings') is assigned centrally in app.routes.ts.
 */
@UseGuards(JwtAuthGuard)
@Controller()
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.meetingsService.findOne(id, user.userId);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateMeetingDto,
  ) {
    return this.meetingsService.update(id, user.userId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.meetingsService.remove(id, user.userId);
  }

  @Get(':id/file')
  async downloadFile(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { meeting, stream } = await this.meetingsService.getFile(
      id,
      user.userId,
    );

    res.set({
      'Content-Type': meeting.mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(
        meeting.originalName,
      )}"`,
    });

    return new StreamableFile(stream);
  }
}
