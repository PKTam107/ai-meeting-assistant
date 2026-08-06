import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RouterModule } from '@nestjs/core';

import { validateEnv } from '@/common/config/env.validation';
import { StorageModule } from '@/common/storage/storage.module';

import { PrismaModule } from '@/database/prisma.module';

import { AuthModule } from '@/modules/auth/auth.module';
import { WorkspacesModule } from '@/modules/workspaces/workspaces.module';
import { MeetingsModule } from '@/modules/meetings/meetings.module';
import { WorkspaceMeetingsModule } from '@/modules/meetings/workspace-meetings.module';
import { TranscriptsModule } from '@/modules/transcripts/transcripts.module';
import { SummariesModule } from '@/modules/summaries/summaries.module';
import { ActionItemsModule } from '@/modules/action-items/action-items.module';
import { MeetingActionItemsModule } from '@/modules/action-items/meeting-action-items.module';

import { appRoutes } from './app.routes';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),

    PrismaModule,
    StorageModule,

    AuthModule,

    // Feature modules. Their route prefixes are declared centrally below.
    WorkspacesModule,
    MeetingsModule,
    WorkspaceMeetingsModule,
    TranscriptsModule,
    SummariesModule,
    ActionItemsModule,
    MeetingActionItemsModule,

    RouterModule.register(appRoutes),
  ],
})
export class AppModule {}
