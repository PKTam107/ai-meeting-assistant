import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  MEDIA_METADATA_DEAD_LETTER_QUEUE,
  MEDIA_METADATA_QUEUE,
} from './queues';
import { redisConnectionFromUrl } from './redis.connection';

/**
 * Redis connection plus the queue registrations, imported by both roots: the
 * API (which only produces) and the worker (which consumes). Registering the
 * same queues on both sides is what makes them the same queue — a producer and
 * a consumer never talk to each other, only to Redis.
 */
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: redisConnectionFromUrl(
          configService.getOrThrow<string>('REDIS_URL'),
        ),
      }),
    }),
    BullModule.registerQueue(
      { name: MEDIA_METADATA_QUEUE },
      { name: MEDIA_METADATA_DEAD_LETTER_QUEUE },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
