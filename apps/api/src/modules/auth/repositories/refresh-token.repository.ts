import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/database/prisma.service';

import type { RefreshToken } from '../../../../generated/prisma/client';

export interface CreateRefreshTokenData {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

/**
 * Data-access layer for the RefreshToken aggregate.
 * Only the SHA-256 hash of a token is ever persisted; the raw token lives only
 * in the client's httpOnly cookie.
 */
@Injectable()
export class RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateRefreshTokenData): Promise<RefreshToken> {
    return this.prisma.refreshToken.create({ data });
  }

  findById(id: string): Promise<RefreshToken | null> {
    return this.prisma.refreshToken.findUnique({ where: { id } });
  }

  /**
   * Atomically revoke a token only if it is still active, and report whether
   * this call is the one that did it. Rotation depends on that exclusivity: a
   * `false` return means someone else already spent this token, which is the
   * reuse signal. Checking `revokedAt` with a separate read first would leave a
   * window where two concurrent refreshes both believe they won.
   */
  async revokeIfActive(id: string, revokedAt: Date): Promise<boolean> {
    const { count } = await this.prisma.refreshToken.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt },
    });

    return count > 0;
  }

  /** Revoke every still-active token for a user (logout-all / theft response). */
  revokeAllForUser(userId: string, revokedAt: Date): Promise<{ count: number }> {
    return this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt },
    });
  }
}
