import { createHash } from 'crypto';

import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';

import { UsersService } from '@/modules/users/services/users.service';

import { RefreshTokenRepository } from '../repositories/refresh-token.repository';
import { AuthService } from './auth.service';

/**
 * These tests pin the refresh-token rotation contract, which is the security
 * boundary of the whole app:
 *
 *   - a refresh token is single-use
 *   - failing to spend it is the reuse signal, and costs the user every session
 *   - an expired token is NOT a reuse signal
 *
 * The reuse branch is deliberately driven through `revokeIfActive` returning
 * false rather than through a pre-set `revokedAt`. That is the only way the
 * race is observable: two concurrent refreshes both read an active row, and the
 * loser only finds out when its conditional UPDATE matches nothing.
 */
describe('AuthService.refresh', () => {
  const RAW_TOKEN = 'a-refresh-token';
  const JTI = 'token-jti';
  const USER_ID = 'user-1';

  const hashOf = (token: string) =>
    createHash('sha256').update(token).digest('hex');

  const storedToken = (overrides: Record<string, unknown> = {}) => ({
    id: JTI,
    userId: USER_ID,
    tokenHash: hashOf(RAW_TOKEN),
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
    createdAt: new Date(),
    ...overrides,
  });

  let service: AuthService;
  let repository: jest.Mocked<RefreshTokenRepository>;
  let users: jest.Mocked<UsersService>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: RefreshTokenRepository,
          useValue: {
            create: jest.fn().mockResolvedValue(undefined),
            findById: jest.fn(),
            revokeIfActive: jest.fn(),
            revokeAllForUser: jest.fn().mockResolvedValue({ count: 3 }),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findById: jest
              .fn()
              .mockResolvedValue({ id: USER_ID, email: 'me@example.com' }),
          },
        },
        {
          provide: JwtService,
          useValue: {
            verifyAsync: jest
              .fn()
              .mockResolvedValue({ sub: USER_ID, jti: JTI }),
            signAsync: jest.fn().mockResolvedValue('a-newly-signed-token'),
            decode: jest
              .fn()
              .mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 }),
          },
        },
        {
          provide: ConfigService,
          useValue: { getOrThrow: jest.fn().mockReturnValue('test-secret') },
        },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
    repository = moduleRef.get(RefreshTokenRepository);
    users = moduleRef.get(UsersService);
  });

  it('rotates the token and issues a new pair when the claim succeeds', async () => {
    repository.findById.mockResolvedValue(storedToken());
    repository.revokeIfActive.mockResolvedValue(true);

    const result = await service.refresh(RAW_TOKEN);

    expect(repository.revokeIfActive).toHaveBeenCalledWith(
      JTI,
      expect.any(Date),
    );
    expect(result.accessToken).toBe('a-newly-signed-token');
    // A successful rotation must never look like theft.
    expect(repository.revokeAllForUser).not.toHaveBeenCalled();
    // The replacement token is persisted, so the new one is spendable too.
    expect(repository.create).toHaveBeenCalled();
  });

  it('revokes every session when the claim is lost (token reuse)', async () => {
    // The row still looks active on read — this is the losing side of the race,
    // or a replay of a token that was rotated away moments ago.
    repository.findById.mockResolvedValue(storedToken());
    repository.revokeIfActive.mockResolvedValue(false);

    await expect(service.refresh(RAW_TOKEN)).rejects.toThrow(
      UnauthorizedException,
    );

    expect(repository.revokeAllForUser).toHaveBeenCalledWith(
      USER_ID,
      expect.any(Date),
    );
    // No replacement token may be minted for whoever lost the claim.
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('rejects an expired token WITHOUT revoking every session', async () => {
    repository.findById.mockResolvedValue(
      storedToken({ expiresAt: new Date(Date.now() - 60_000) }),
    );

    await expect(service.refresh(RAW_TOKEN)).rejects.toThrow(
      'Refresh token has expired',
    );

    // Ordering matters: an expired token is worthless to an attacker, so
    // treating it as reuse would let anyone holding an old token log the user
    // out at will. The claim must not even be attempted.
    expect(repository.revokeAllForUser).not.toHaveBeenCalled();
    expect(repository.revokeIfActive).not.toHaveBeenCalled();
  });

  it('rejects a token whose hash does not match the stored one', async () => {
    repository.findById.mockResolvedValue(
      storedToken({ tokenHash: hashOf('a-different-token') }),
    );

    await expect(service.refresh(RAW_TOKEN)).rejects.toThrow(
      'Invalid refresh token',
    );

    expect(repository.revokeIfActive).not.toHaveBeenCalled();
    expect(repository.revokeAllForUser).not.toHaveBeenCalled();
  });

  it('rejects when the token has no matching row', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.refresh(RAW_TOKEN)).rejects.toThrow(
      'Invalid refresh token',
    );

    expect(repository.revokeIfActive).not.toHaveBeenCalled();
  });

  it('rejects when no token is presented at all', async () => {
    await expect(service.refresh(undefined)).rejects.toThrow(
      'Missing refresh token',
    );

    expect(repository.findById).not.toHaveBeenCalled();
  });

  it('rejects when the owning user is gone, without spending the token', async () => {
    repository.findById.mockResolvedValue(storedToken());
    users.findById.mockResolvedValue(null);

    await expect(service.refresh(RAW_TOKEN)).rejects.toThrow(
      'Invalid refresh token',
    );

    expect(repository.revokeIfActive).not.toHaveBeenCalled();
  });
});
