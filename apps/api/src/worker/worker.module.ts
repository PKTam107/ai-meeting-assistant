import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { validateEnv } from '@/common/config/env.validation';
import { LoggingModule } from '@/common/logging/logging.module';
import { StorageModule } from '@/common/storage/storage.module';
import { PrismaModule } from '@/database/prisma.module';
import { MeetingRepository } from '@/modules/meetings/repositories/meeting.repository';
import { QueueModule } from '@/queue/queue.module';

import { MediaMetadataProcessor } from './processors/media-metadata.processor';
import { MediaProbeService } from './services/media-probe.service';

/**
 * Root module of the worker process.
 *
 * The worker shares this repository's database, storage and queue wiring with
 * the API but has no HTTP surface at all: it is started as a Nest application
 * *context*, not a server. It pulls `MeetingRepository` in directly rather
 * than importing `MeetingsModule`, because that module exists to serve HTTP
 * routes and the worker has no use for its controllers.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    LoggingModule,
    PrismaModule,
    StorageModule,
    QueueModule,
  ],
  providers: [MeetingRepository, MediaProbeService, MediaMetadataProcessor],
})
export class WorkerModule {}
