/** Public representation of a user — never includes the password hash. */
export interface UserDto {
  id: string;
  email: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

/** Returned by both register and login. */
export interface AuthResult {
  user: UserDto;
  accessToken: string;
}

/** Decoded JWT payload. */
export interface JwtPayload {
  sub: string;
  email: string;
}
