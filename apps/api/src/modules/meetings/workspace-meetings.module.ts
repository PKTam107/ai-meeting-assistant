import { Module } from '@nestjs/common';

import { MeetingsModule } from './meetings.module';
import { WorkspaceMeetingsController } from './controllers/workspace-meetings.controller';

/**
 * Holds only the workspace-scoped meeting controller so it can be mounted under
 * the `workspaces/:workspaceId/meetings` prefix in app.routes.ts, separate from
 * the flat `meetings` controller. Logic lives in MeetingsService (imported).
 */
@Module({
  imports: [MeetingsModule],
  controllers: [WorkspaceMeetingsController],
})
export class WorkspaceMeetingsModule {}
