import { execFile } from 'child_process';
import { promisify } from 'util';

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const execFileAsync = promisify(execFile);

/**
 * A probe that did not produce a duration, carrying the one thing the caller
 * has to decide on: whether trying again could ever help.
 *
 * `permanent: true`  — the input is the problem (corrupt, not media, no
 *                      duration in the container). The same bytes will fail
 *                      the same way forever.
 * `permanent: false` — our side is the problem (ffprobe not installed, timed
 *                      out, killed). The same bytes may well succeed later.
 *
 * Getting this split wrong is expensive in both directions: retrying a corrupt
 * file burns the queue on work that cannot succeed, and failing a meeting
 * because a binary was briefly missing loses data the user gave us.
 */
export class MediaProbeError extends Error {
  constructor(
    message: string,
    readonly permanent: boolean,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'MediaProbeError';
  }
}

/** Shape of the `ffprobe -show_format -print_format json` output we read. */
interface FfprobeOutput {
  format?: { duration?: string };
}

interface ExecFailure {
  code?: string;
  killed?: boolean;
  signal?: string;
  stderr?: string;
}

@Injectable()
export class MediaProbeService {
  private readonly logger = new Logger(MediaProbeService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Duration of a media file in whole seconds, as reported by its container
   * metadata. Rounded up: a 0.4s clip is a 1-second recording, not a
   * zero-second one, and a duration of 0 is how "no media here" reads.
   */
  async durationSec(path: string): Promise<number> {
    const ffprobePath =
      this.configService.get<string>('FFPROBE_PATH') ?? 'ffprobe';
    const timeout =
      this.configService.get<number>('MEDIA_PROBE_TIMEOUT_MS') ?? 30_000;

    let stdout: string;

    try {
      ({ stdout } = await execFileAsync(
        ffprobePath,
        [
          '-v',
          'error',
          '-show_format',
          '-print_format',
          'json',
          // Everything after this is data, never a flag — a filename that
          // starts with a dash must not turn into an ffprobe option.
          '-i',
          path,
        ],
        { timeout, maxBuffer: 1024 * 1024 },
      ));
    } catch (error) {
      throw this.classify(error, ffprobePath, timeout);
    }

    return this.readDuration(stdout, path);
  }

  /** Decide whether an `ffprobe` failure is worth another attempt. */
  private classify(
    error: unknown,
    ffprobePath: string,
    timeout: number,
  ): MediaProbeError {
    const failure = (error ?? {}) as ExecFailure;

    if (failure.code === 'ENOENT') {
      return new MediaProbeError(
        `ffprobe not found at "${ffprobePath}". Install ffmpeg or set FFPROBE_PATH.`,
        false,
        error,
      );
    }

    if (failure.killed || failure.signal === 'SIGTERM') {
      return new MediaProbeError(
        `ffprobe did not finish within ${timeout}ms`,
        false,
        error,
      );
    }

    // A non-zero exit with the file readable means ffprobe understood the
    // request and rejected the input.
    const stderr = failure.stderr?.trim();
    return new MediaProbeError(
      `ffprobe rejected the file${stderr ? `: ${stderr}` : ''}`,
      true,
      error,
    );
  }

  private readDuration(stdout: string, path: string): number {
    let parsed: FfprobeOutput;

    try {
      parsed = JSON.parse(stdout) as FfprobeOutput;
    } catch (error) {
      // ffprobe exited 0 but did not produce JSON. Nothing about the file will
      // change this, and a retry would just do it again.
      this.logger.error(`Unreadable ffprobe output for ${path}`);
      throw new MediaProbeError('ffprobe output was not JSON', true, error);
    }

    const duration = Number(parsed.format?.duration);

    if (!Number.isFinite(duration) || duration <= 0) {
      throw new MediaProbeError(
        'file carries no usable duration — it is probably not playable media',
        true,
      );
    }

    return Math.ceil(duration);
  }
}
