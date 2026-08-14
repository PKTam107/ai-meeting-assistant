import { Module } from '@nestjs/common';

import { QueueModule } from '@/queue/queue.module';
import { WorkspacesModule } from '@/modules/workspaces/workspaces.module';

import { MeetingsController } from './controllers/meetings.controller';
import { MeetingsService } from './services/meetings.service';
import { MeetingRepository } from './repositories/meeting.repository';

@Module({
  // WorkspacesModule exports WorkspacesService (the membership access gate).
  // StorageService is provided globally by StorageModule.
  // QueueModule brings the media-metadata queue this service produces to.
  imports: [WorkspacesModule, QueueModule],

  // Only the flat /meetings/:id routes live here; the workspace-scoped
  // upload/list routes are in WorkspaceMeetingsModule (different route prefix).
  controllers: [MeetingsController],

  providers: [MeetingsService, MeetingRepository],

  // MeetingsService.loadAccessible is reused by the workspace-meetings,
  // transcript, summary, and action-item modules.
  exports: [MeetingsService],
})
export class MeetingsModule {}
