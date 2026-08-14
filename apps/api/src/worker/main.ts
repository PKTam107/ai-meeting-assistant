import { NestFactory } from '@nestjs/core';

import { Logger } from 'nestjs-pino';

import { WorkerModule } from './worker.module';

/**
 * Entry point of the worker process (`pnpm start:worker`).
 *
 * This is a second process over the same codebase, not a second server. It
 * listens to Redis instead of a port, so it is created as an application
 * context — `NestFactory.create` would open an HTTP listener nobody calls.
 */
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    bufferLogs: true,
  });

  app.useLogger(app.get(Logger));

  // On SIGTERM this runs the shutdown hooks, and @nestjs/bullmq closes the
  // BullMQ worker: it stops taking new jobs and waits for the running one to
  // finish. A job killed harder than that is not lost — its lock expires,
  // BullMQ marks it stalled and hands it to another worker, which is exactly
  // the at-least-once delivery every processor here is written to survive.
  app.enableShutdownHooks();

  app.get(Logger).log('Worker running, waiting for jobs');
}

void bootstrap();
