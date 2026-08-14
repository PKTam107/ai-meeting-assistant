import type { RedisOptions } from 'ioredis';

/**
 * Turn a `redis://` / `rediss://` URL into the options BullMQ wants.
 *
 * BullMQ takes an options object rather than a URL, and letting it build the
 * connection (instead of handing it a client we made) means Nest closes the
 * connection on shutdown for us.
 */
export function redisConnectionFromUrl(url: string): RedisOptions {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`REDIS_URL is not a valid URL: ${url}`);
  }

  if (parsed.protocol !== 'redis:' && parsed.protocol !== 'rediss:') {
    throw new Error(
      `REDIS_URL must start with redis:// or rediss://, got ${parsed.protocol}//`,
    );
  }

  const database = parsed.pathname.replace(/^\//, '');

  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 6379,
    username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
    password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    db: database ? Number(database) : undefined,
    ...(parsed.protocol === 'rediss:' ? { tls: {} } : {}),

    // Required by BullMQ: its workers park on blocking commands (`BRPOPLPUSH`)
    // that legitimately wait for minutes, and ioredis' default retry cap would
    // abort them as failures.
    maxRetriesPerRequest: null,
  };
}
