import { Routes } from '@nestjs/core';

import { WorkspacesModule } from '@/modules/workspaces/workspaces.module';
import { MeetingsModule } from '@/modules/meetings/meetings.module';
import { WorkspaceMeetingsModule } from '@/modules/meetings/workspace-meetings.module';
import { TranscriptsModule } from '@/modules/transcripts/transcripts.module';
import { SummariesModule } from '@/modules/summaries/summaries.module';
import { ActionItemsModule } from '@/modules/action-items/action-items.module';
import { MeetingActionItemsModule } from '@/modules/action-items/meeting-action-items.module';

/**
 * Central route table. Each module is mounted at one path prefix (params
 * allowed), so controllers stay prefix-free (`@Controller()`) and the whole URL
 * hierarchy is readable in one place. All paths sit under the global `api`
 * prefix set in main.ts.
 *
 * AuthModule keeps its own `@Controller('auth')` prefix and is intentionally
 * left out of this table.
 */
export const appRoutes: Routes = [
  { path: 'workspaces', module: WorkspacesModule },
  { path: 'workspaces/:workspaceId/meetings', module: WorkspaceMeetingsModule },

  { path: 'meetings', module: MeetingsModule },
  { path: 'meetings/:meetingId/transcript', module: TranscriptsModule },
  { path: 'meetings/:meetingId/summary', module: SummariesModule },
  {
    path: 'meetings/:meetingId/action-items',
    module: MeetingActionItemsModule,
  },

  { path: 'action-items', module: ActionItemsModule },
];
