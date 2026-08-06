import { createHash, randomUUID } from 'crypto';

import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { JwtSignOptions } from '@nestjs/jwt';

import * as bcrypt from 'bcrypt';

import { UsersService } from '@/modules/users/services/users.service';

import { RefreshTokenRepository } from '../repositories/refresh-token.repository';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { RefreshTokenPayload } from '../interfaces/jwt-payload.interface';

import type { User } from '../../../../generated/prisma/client';

export interface AuthTokens {
  user: { id: string; email: string };
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthTokens> {
    const existingUser = await this.usersService.findByEmail(dto.email);

    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
    });

    return this.issueTokens(user);
  }

  async login(dto: LoginDto): Promise<AuthTokens> {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.issueTokens(user);
  }

  /**
   * Rotate a refresh token: validate the presented one, revoke it, and issue a
   * fresh access + refresh pair. If a token that was already revoked is
   * presented (token reuse), every active token for that user is revoked as a
   * theft-mitigation measure.
   */
  async refresh(rawToken: string | undefined): Promise<AuthTokens> {
    if (!rawToken) {
      throw new UnauthorizedException('Missing refresh token');
    }

    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        rawToken,
        { secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET') },
      );
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const stored = await this.refreshTokenRepository.findById(payload.jti);

    if (!stored || stored.tokenHash !== this.hashToken(rawToken)) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (stored.revokedAt) {
      // The token was valid but already rotated away — likely replayed/stolen.
      await this.refreshTokenRepository.revokeAllForUser(
        stored.userId,
        new Date(),
      );
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    if (stored.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    const user = await this.usersService.findById(stored.userId);
    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.refreshTokenRepository.revoke(stored.id, new Date());

    return this.issueTokens(user);
  }

  /** Best-effort logout: revoke the presented token if it is valid. */
  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) {
      return;
    }

    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        rawToken,
        { secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET') },
      );
    } catch {
      return;
    }

    const stored = await this.refreshTokenRepository.findById(payload.jti);
    if (stored && !stored.revokedAt) {
      await this.refreshTokenRepository.revoke(stored.id, new Date());
    }
  }

  private async issueTokens(user: User): Promise<AuthTokens> {
    const accessToken = await this.signAccessToken(user.id, user.email);
    const { token: refreshToken, expiresAt: refreshTokenExpiresAt } =
      await this.issueRefreshToken(user.id);

    return {
      user: { id: user.id, email: user.email },
      accessToken,
      refreshToken,
      refreshTokenExpiresAt,
    };
  }

  private signAccessToken(userId: string, email: string): Promise<string> {
    // Uses the default secret/expiry configured on JwtModule (access token).
    return this.jwtService.signAsync({ sub: userId, email });
  }

  private async issueRefreshToken(
    userId: string,
  ): Promise<{ token: string; expiresAt: Date }> {
    const jti = randomUUID();

    const token = await this.jwtService.signAsync(
      { sub: userId },
      {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.getOrThrow<string>(
          'JWT_REFRESH_EXPIRES_IN',
        ) as JwtSignOptions['expiresIn'],
        jwtid: jti,
      },
    );

    const decoded = this.jwtService.decode<{ exp: number }>(token);
    const expiresAt = new Date(decoded.exp * 1000);

    await this.refreshTokenRepository.create({
      id: jti,
      userId,
      tokenHash: this.hashToken(token),
      expiresAt,
    });

    return { token, expiresAt };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
