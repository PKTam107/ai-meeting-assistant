import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  // Buffered so the lines logged while Nest boots are not lost before
  // `useLogger` swaps in pino below.
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const configService = app.get(ConfigService);

  app.useLogger(app.get(Logger));

  app.use(
    helmet({
      // The web app is a different origin, so the default `same-origin`
      // resource policy would block it from reading anything this API serves.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(compression());

  app.setGlobalPrefix('api');

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Lets SIGTERM run the onModuleDestroy hooks — without it the process dies
  // with the database pool still open.
  app.enableShutdownHooks();

  const port = configService.getOrThrow<number>('PORT');
  await app.listen(port);

  app.get(Logger).log(`🚀 Server running on http://localhost:${port}`);
}

void bootstrap();
