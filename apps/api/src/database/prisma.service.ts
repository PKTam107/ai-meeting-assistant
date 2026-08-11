import { INestApplication, Injectable, OnModuleInit } from '@nestjs/common';

import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../../generated/prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    super({
      adapter: new PrismaPg({
        connectionString: process.env.DATABASE_URL,
      }),
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  enableShutdownHooks(app: INestApplication) {
    // `beforeExit` listeners are called synchronously and the process will not
    // wait on a returned promise, so awaiting here would be misleading.
    process.on('beforeExit', () => {
      void app.close();
    });
  }
}
