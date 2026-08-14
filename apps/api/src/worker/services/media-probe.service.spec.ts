import { spawnSync } from 'child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { ConfigService } from '@nestjs/config';

import { MediaProbeError, MediaProbeService } from './media-probe.service';

const FFPROBE = process.env.FFPROBE_PATH ?? 'ffprobe';

const ffprobeInstalled =
  spawnSync(FFPROBE, ['-version'], { stdio: 'ignore' }).status === 0;

// Skipping quietly is how a test that never runs anywhere goes unnoticed for
// months. Locally it is a warning; in CI it is a failure, because CI is the
// one place this is guaranteed to be installed.
if (!ffprobeInstalled) {
  const message = `ffprobe ("${FFPROBE}") is not installed, so the probe cannot be tested against a real file`;

  if (process.env.CI) {
    throw new Error(`${message}. CI must install ffmpeg.`);
  }

  console.warn(`⚠ ${message}. Install ffmpeg to run these locally.`);
}

/**
 * A valid 1.5-second WAV: 44-byte header plus 8-bit mono samples at 8 kHz.
 *
 * Written by hand rather than checked in as a fixture, and rather than
 * produced with ffmpeg — the point is to test the probe on real media without
 * needing the tool under test to create it.
 */
function silentWav(seconds: number): Buffer {
  const sampleRate = 8_000;
  const dataSize = Math.round(sampleRate * seconds);
  const buffer = Buffer.alloc(44 + dataSize, 128); // 128 = silence for 8-bit PCM

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4); // file size after this field
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // fmt chunk size
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate, 28); // byte rate: 1 byte per sample
  buffer.writeUInt16LE(1, 32); // block align
  buffer.writeUInt16LE(8, 34); // bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  return buffer;
}

describe('MediaProbeService', () => {
  let directory: string;

  const serviceWith = (ffprobePath: string) =>
    new MediaProbeService({
      get: (key: string) => (key === 'FFPROBE_PATH' ? ffprobePath : 5_000),
    } as unknown as ConfigService);

  beforeAll(() => {
    directory = mkdtempSync(join(tmpdir(), 'media-probe-'));
  });

  afterAll(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  it('treats a missing ffprobe as our problem, not the file’s', async () => {
    const path = join(directory, 'whatever.wav');
    writeFileSync(path, silentWav(1));

    const error = await serviceWith('ffprobe-that-is-not-installed')
      .durationSec(path)
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(MediaProbeError);
    // Retrying after someone installs ffmpeg succeeds, so this must not be
    // permanent — marking the meeting FAILED here would lose real data.
    expect((error as MediaProbeError).permanent).toBe(false);
    expect((error as MediaProbeError).message).toContain('Install ffmpeg');
  });

  (ffprobeInstalled ? describe : describe.skip)('against real ffprobe', () => {
    it('rounds a duration up to whole seconds', async () => {
      const path = join(directory, 'meeting.wav');
      writeFileSync(path, silentWav(1.5));

      // 1.5s of audio is a 2-second recording, never a 1-second one: rounding
      // down would report a duration shorter than the media actually is.
      await expect(serviceWith(FFPROBE).durationSec(path)).resolves.toBe(2);
    });

    it('refuses to retry a file that is not media', async () => {
      const path = join(directory, 'notes.txt');
      writeFileSync(path, 'this is not a recording');

      const error = await serviceWith(FFPROBE)
        .durationSec(path)
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(MediaProbeError);
      expect((error as MediaProbeError).permanent).toBe(true);
    });

    it('refuses to retry media that carries no duration', async () => {
      const path = join(directory, 'empty.wav');
      writeFileSync(path, silentWav(0));

      const error = await serviceWith(FFPROBE)
        .durationSec(path)
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(MediaProbeError);
      expect((error as MediaProbeError).permanent).toBe(true);
    });
  });
});
