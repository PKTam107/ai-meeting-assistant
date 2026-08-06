import { Module } from '@nestjs/common';

import { MeetingsModule } from '@/modules/meetings/meetings.module';
import { WorkspacesModule } from '@/modules/workspaces/workspaces.module';

import { ActionItemsController } from './controllers/action-items.controller';
import { ActionItemsService } from './services/action-items.service';
import { ActionItemRepository } from './repositories/action-item.repository';

@Module({
  // MeetingsModule → meeting-access check; WorkspacesModule → assignee
  // membership validation.
  imports: [MeetingsModule, WorkspacesModule],

  // Only the flat /action-items/:id routes; the meeting-scoped list/create
  // routes are in MeetingActionItemsModule (different route prefix).
  controllers: [ActionItemsController],

  providers: [ActionItemsService, ActionItemRepository],

  exports: [ActionItemsService],
})
export class ActionItemsModule {}
