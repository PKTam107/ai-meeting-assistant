import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { LoggerModule, type Params } from 'nestjs-pino';

import { NodeEnv } from '@/common/config/env.validation';

/**
 * Structured logging for both processes.
 *
 * `pino` and `nestjs-pino` have been dependencies since the first commit
 * without being wired to anything, so until now every log line was Nest's
 * default human-formatted text — unparseable by any log aggregator, and with
 * no request correlation at all.
 */
export function pinoParams(nodeEnv: NodeEnv): Params {
  const isProduction = nodeEnv === NodeEnv.Production;

  return {
    pinoHttp: {
      // Tests boot the whole AppModule, and a request log per supertest call
      // buries the actual test output.
      level:
        nodeEnv === NodeEnv.Test ? 'silent' : isProduction ? 'info' : 'debug',

      // These carry live credentials. A log aggregator is exactly the kind of
      // place a leaked refresh token outlives the session it belonged to.
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'res.headers["set-cookie"]',
        ],
        censor: '[redacted]',
      },

      // JSON is for machines; a developer reading a terminal is not one.
      // `pino-pretty` is a devDependency, so this branch must never be taken
      // in production.
      ...(isProduction
        ? {}
        : {
            transport: {
              target: 'pino-pretty',
              options: { singleLine: true, translateTime: 'HH:MM:ss' },
            },
          }),
    },
  };
}

@Module({
  imports: [
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        pinoParams(configService.getOrThrow<NodeEnv>('NODE_ENV')),
    }),
  ],
  exports: [LoggerModule],
})
export class LoggingModule {}
