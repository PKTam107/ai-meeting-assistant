export interface JwtPayload {
  sub: string;
  email: string;
}

/**
 * Payload of a refresh token. `jti` is the id of the matching RefreshToken row,
 * letting us look the token up for rotation/revocation without scanning.
 */
export interface RefreshTokenPayload {
  sub: string;
  jti: string;
}