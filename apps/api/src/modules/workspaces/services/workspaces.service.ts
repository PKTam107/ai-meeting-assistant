import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { UsersService } from '@/modules/users/services/users.service';

import { WorkspaceRepository } from '../repositories/workspace.repository';
import {
  WorkspaceMemberRepository,
  WorkspaceMemberWithUser,
} from '../repositories/workspace-member.repository';
import { CreateWorkspaceDto } from '../dto/create-workspace.dto';
import { UpdateWorkspaceDto } from '../dto/update-workspace.dto';
import { AddMemberDto } from '../dto/add-member.dto';
import { WorkspaceAction, WorkspacePolicy } from '../policies/workspace.policy';

import type {
  Workspace,
  WorkspaceMember,
  WorkspaceRole,
} from '../../../../generated/prisma/client';

@Injectable()
export class WorkspacesService {
  constructor(
    private readonly workspaceRepository: WorkspaceRepository,
    private readonly memberRepository: WorkspaceMemberRepository,
    private readonly usersService: UsersService,
    private readonly policy: WorkspacePolicy,
  ) {}

  create(userId: string, dto: CreateWorkspaceDto): Promise<Workspace> {
    return this.workspaceRepository.createWithOwner({
      name: dto.name,
      ownerId: userId,
    });
  }

  findAllForUser(userId: string): Promise<Workspace[]> {
    return this.workspaceRepository.findAllForUser(userId);
  }

  async findOne(workspaceId: string, userId: string): Promise<Workspace> {
    const workspace = await this.workspaceRepository.findById(workspaceId);
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }
    await this.assertMember(workspaceId, userId);
    return workspace;
  }

  async update(
    workspaceId: string,
    userId: string,
    dto: UpdateWorkspaceDto,
  ): Promise<Workspace> {
    await this.assertCan(workspaceId, userId, 'workspace:update');
    return this.workspaceRepository.update(workspaceId, { name: dto.name });
  }

  async remove(workspaceId: string, userId: string): Promise<void> {
    await this.assertCan(workspaceId, userId, 'workspace:delete');
    await this.workspaceRepository.delete(workspaceId);
  }

  listMembers(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMemberWithUser[]> {
    return this.assertMember(workspaceId, userId).then(() =>
      this.memberRepository.listByWorkspace(workspaceId),
    );
  }

  async addMember(
    workspaceId: string,
    actingUserId: string,
    dto: AddMemberDto,
  ): Promise<WorkspaceMember> {
    await this.assertCan(workspaceId, actingUserId, 'workspace:manageMembers');

    const role: WorkspaceRole = dto.role ?? 'MEMBER';
    if (role === 'OWNER') {
      throw new BadRequestException('Cannot assign the OWNER role');
    }

    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new NotFoundException('No user with that email');
    }

    const existing = await this.memberRepository.findByWorkspaceAndUser(
      workspaceId,
      user.id,
    );
    if (existing) {
      throw new BadRequestException('User is already a member');
    }

    return this.memberRepository.create({ workspaceId, userId: user.id, role });
  }

  async removeMember(
    workspaceId: string,
    actingUserId: string,
    targetUserId: string,
  ): Promise<void> {
    await this.assertCan(workspaceId, actingUserId, 'workspace:manageMembers');

    const target = await this.memberRepository.findByWorkspaceAndUser(
      workspaceId,
      targetUserId,
    );
    if (!target) {
      throw new NotFoundException('Member not found');
    }
    if (target.role === 'OWNER') {
      throw new BadRequestException('Cannot remove the workspace owner');
    }

    await this.memberRepository.delete(workspaceId, targetUserId);
  }

  /**
   * Guard used across feature modules: confirm `userId` belongs to the
   * workspace, returning the membership row (carrying the role). Throws
   * ForbiddenException otherwise — callers can rely on this never returning
   * null.
   */
  async assertMember(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMember> {
    const member = await this.memberRepository.findByWorkspaceAndUser(
      workspaceId,
      userId,
    );
    if (!member) {
      throw new ForbiddenException('Not a member of this workspace');
    }
    return member;
  }

  /** Non-throwing membership check (e.g. to validate an action-item assignee). */
  async isMember(workspaceId: string, userId: string): Promise<boolean> {
    const member = await this.memberRepository.findByWorkspaceAndUser(
      workspaceId,
      userId,
    );
    return member !== null;
  }

  /**
   * Authorization gate: confirm `userId` is a member AND that their role is
   * allowed to perform `action`. The role→action rules live in WorkspacePolicy
   * — call sites name the action, never the roles. Returns the membership row.
   */
  async assertCan(
    workspaceId: string,
    userId: string,
    action: WorkspaceAction,
  ): Promise<WorkspaceMember> {
    const member = await this.assertMember(workspaceId, userId);
    this.policy.assert(action, member.role);
    return member;
  }

  /**
   * Non-throwing capability check, for branching logic that combines a role
   * capability with a resource-ownership rule (see MeetingsService.remove).
   */
  can(action: WorkspaceAction, role: WorkspaceRole): boolean {
    return this.policy.can(action, role);
  }
}
