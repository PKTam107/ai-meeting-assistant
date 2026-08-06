import { Module } from '@nestjs/common';

import { UsersService } from './services/users.service';
import { UserRepository } from './repositories/user.repository';

/**
 * Source of truth for the User aggregate. AuthModule and WorkspacesModule
 * import this to look up / create users instead of owning the repository.
 */
@Module({
  providers: [UsersService, UserRepository],
  exports: [UsersService],
})
export class UsersModule {}
