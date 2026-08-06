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

  revoke(id: string, revokedAt: Date): Promise<RefreshToken> {
    return this.prisma.refreshToken.update({
      where: { id },
      data: { revokedAt },
    });
  }

  /** Revoke every still-active token for a user (logout-all / theft response). */
  revokeAllForUser(userId: string, revokedAt: Date): Promise<{ count: number }> {
    return this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt },
    });
  }
}
