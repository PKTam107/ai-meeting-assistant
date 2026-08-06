import { randomUUID } from 'crypto';
import { createReadStream, ReadStream } from 'fs';
import { mkdir, rm, stat, writeFile } from 'fs/promises';
import { dirname, extname, join, resolve, sep } from 'path';

import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SaveFileOptions {
  buffer: Buffer;
  /** Original client filename — only its extension is preserved. */
  originalName: string;
  /** Logical sub-folder within the storage root, e.g. `'meetings'`. */
  prefix?: string;
}

export interface StoredFile {
  /** Opaque, forward-slashed key persisted on the owning record. */
  key: string;
  size: number;
}

/**
 * File storage abstraction. The rest of the app deals only in opaque `key`s and
 * never touches the filesystem directly, so the local-disk backend here can be
 * swapped for S3 later without changing any caller. Keys are validated against
 * the storage root to prevent path-traversal.
 */
@Injectable()
export class StorageService {
  private readonly root: string;

  constructor(private readonly configService: ConfigService) {
    const dir = this.configService.get<string>('STORAGE_LOCAL_DIR') ?? './storage';
    this.root = resolve(process.cwd(), dir);
  }

  async save({
    buffer,
    originalName,
    prefix = '',
  }: SaveFileOptions): Promise<StoredFile> {
    const ext = extname(originalName);
    const key = join(prefix, `${randomUUID()}${ext}`).split(sep).join('/');

    const absPath = this.resolveKey(key);
    await mkdir(dirname(absPath), { recursive: true });
    await writeFile(absPath, buffer);

    return { key, size: buffer.byteLength };
  }

  createReadStream(key: string): ReadStream {
    return createReadStream(this.resolveKey(key));
  }

  async delete(key: string): Promise<void> {
    await rm(this.resolveKey(key), { force: true });
  }

  async exists(key: string): Promise<boolean> {
    try {
      await stat(this.resolveKey(key));
      return true;
    } catch {
      return false;
    }
  }

  /** Resolve a storage key to an absolute path, refusing anything that would
   * escape the configured root (`..`, absolute paths, …). */
  private resolveKey(key: string): string {
    const absPath = resolve(this.root, key);

    if (absPath !== this.root && !absPath.startsWith(this.root + sep)) {
      throw new NotFoundException('Invalid storage key');
    }

    return absPath;
  }
}
