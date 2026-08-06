import { Module } from '@nestjs/common';

import { AuthModule } from '@/modules/auth/auth.module';
import { UsersModule } from '@/modules/users/users.module';

import { WorkspacesController } from './controllers/workspaces.controller';
import { WorkspacesService } from './services/workspaces.service';
import { WorkspaceRepository } from './repositories/workspace.repository';
import { WorkspaceMemberRepository } from './repositories/workspace-member.repository';
import { WorkspacePolicy } from './policies/workspace.policy';

@Module({
  // UsersModule provides UsersService (member lookup by email); AuthModule
  // registers the JWT strategy backing JwtAuthGuard.
  imports: [AuthModule, UsersModule],

  controllers: [WorkspacesController],

  providers: [
    WorkspacesService,
    WorkspaceRepository,
    WorkspaceMemberRepository,
    // Single source of truth for role→action authorization rules.
    WorkspacePolicy,
  ],

  // WorkspacesService.assertMember/assertCan are the access gate other feature
  // modules (meetings, etc.) rely on.
  exports: [WorkspacesService],
})
export class WorkspacesModule {}
