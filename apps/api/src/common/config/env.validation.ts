import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  validateSync,
} from 'class-validator';

export enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

/**
 * Schema of all environment variables the API depends on.
 * `validate()` is wired into ConfigModule so the process fails fast on boot
 * when a required variable is missing or malformed — no silent fallbacks.
 */
export class EnvironmentVariables {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @IsInt()
  PORT: number = 4000;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @MinLength(16, {
    message: 'JWT_SECRET must be at least 16 characters long',
  })
  JWT_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_EXPIRES_IN: string = '15m';

  @IsString()
  @MinLength(16, {
    message: 'JWT_REFRESH_SECRET must be at least 16 characters long',
  })
  JWT_REFRESH_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_EXPIRES_IN: string = '7d';

  // --- File storage (local disk for now; swappable to S3 later) ---

  /** Root directory for uploaded meeting files, relative to the API cwd. */
  @IsString()
  @IsNotEmpty()
  STORAGE_LOCAL_DIR: string = './storage';

  /** Max upload size in megabytes, enforced by MeetingsService. */
  @IsOptional()
  @IsInt()
  MAX_UPLOAD_SIZE_MB: number = 1024;
}

export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const details = errors
      .map((error) => Object.values(error.constraints ?? {}).join(', '))
      .join('\n');

    throw new Error(`Invalid environment variables:\n${details}`);
  }

  return validated;
}
