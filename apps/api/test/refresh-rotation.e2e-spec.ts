import { randomUUID } from 'crypto';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { PrismaService } from '../src/database/prisma.service';

/**
 * Refresh-token rotation against a real database.
 *
 * The unit tests next to AuthService can only prove the service *reacts*
 * correctly to a lost claim — they mock the repository, so they cannot observe
 * the thing that actually matters: that two concurrent refreshes can never both
 * succeed. That property lives in a single conditional UPDATE and in
 * PostgreSQL's row-level locking, so it is only testable here.
 */
describe('Refresh token rotation (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();

    // Mirror main.ts: the routes under test only exist behind these.
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalInterceptors(new TransformInterceptor());

    await app.init();
    prisma = moduleRef.get(PrismaService);
  });

  afterAll(async () => {
    if (createdUserIds.length) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    await app.close();
  });

  /** Register a throwaway user and return its first refresh cookie. */
  async function registerUser(): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: `rotation-${randomUUID()}@example.test`,
        password: 'secret123',
      })
      .expect(201);

    // supertest types the body as `any`; name the shape we rely on instead.
    const body = res.body as { data: { user: { id: string } } };

    createdUserIds.push(body.data.user.id);
    return refreshCookieOf(res);
  }

  function refreshCookieOf(res: request.Response): string {
    const header = res.headers['set-cookie'] as unknown as string[] | undefined;
    const cookie = header?.find((c) => c.startsWith('refreshToken='));

    if (!cookie) {
      throw new Error('response carried no refreshToken cookie');
    }

    // Drop the attributes; only the name=value pair is sent back.
    return cookie.split(';')[0];
  }

  const refreshWith = (cookie: string) =>
    request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', cookie);

  it('rotates: the old token dies and a new one is issued', async () => {
    const first = await registerUser();

    const rotated = await refreshWith(first).expect(200);
    const second = refreshCookieOf(rotated);

    expect(second).not.toEqual(first);
    await refreshWith(second).expect(200);
  });

  it('treats replay of a spent token as theft and kills every session', async () => {
    const first = await registerUser();

    const rotated = await refreshWith(first).expect(200);
    const second = refreshCookieOf(rotated);

    // Replaying the token that was already spent.
    await refreshWith(first).expect(401);

    // The response to theft is not just rejecting the replay — every live
    // token for that user must die, including the legitimate current one.
    await refreshWith(second).expect(401);
  });

  it('lets exactly one of two concurrent refreshes win', async () => {
    const cookie = await registerUser();

    const results = await Promise.all([
      refreshWith(cookie).then((r) => r.status),
      refreshWith(cookie).then((r) => r.status),
    ]);

    // This is the assertion the whole atomic-claim change exists for. Before
    // it, both callers could read an active row and both be issued a live
    // token — a silent session fork with no reuse detected.
    expect(results.filter((status) => status === 200)).toHaveLength(1);
    expect(results.filter((status) => status === 401)).toHaveLength(1);
  });

  it('rejects a refresh with no cookie at all', async () => {
    await request(app.getHttpServer()).post('/api/auth/refresh').expect(401);
  });
});
