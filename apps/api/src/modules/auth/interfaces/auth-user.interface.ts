/**
 * The authenticated principal attached to `request.user` by JwtStrategy.
 * This is what `@CurrentUser()` resolves to throughout the app.
 */
export interface AuthUser {
  userId: string;
  email: string;
}
