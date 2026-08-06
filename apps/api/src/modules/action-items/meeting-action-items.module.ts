import { Module } from '@nestjs/common';

import { ActionItemsModule } from './action-items.module';
import { MeetingActionItemsController } from './controllers/meeting-action-items.controller';

/**
 * Holds only the meeting-scoped action-item controller so it can be mounted
 * under `meetings/:meetingId/action-items` in app.routes.ts, separate from the
 * flat `action-items` controller. Logic lives in ActionItemsService (imported).
 */
@Module({
  imports: [ActionItemsModule],
  controllers: [MeetingActionItemsController],
})
export class MeetingActionItemsModule {}
