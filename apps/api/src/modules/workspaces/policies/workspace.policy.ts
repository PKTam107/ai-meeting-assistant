import { ForbiddenException, Injectable } from '@nestjs/common';

import type { WorkspaceRole } from '../../../../generated/prisma/client';

/**
 * Every privileged action that can be performed inside a workspace. Callers
 * express *intent* (`'workspace:update'`) instead of hard-coding role lists, so
 * adding or changing a rule happens in exactly one place: ROLE_CAPABILITIES
 * below.
 */
export type WorkspaceAction =
  | 'workspace:update'
  | 'workspace:delete'
  | 'workspace:manageMembers'
  /** Delete *any* meeting in the workspace, regardless of who uploaded it. */
  | 'meeting:deleteAny';

/**
 * The single source of truth for workspace authorization. Pure role→capability
 * rules live here; resource-ownership rules (e.g. "the uploader may delete
 * their own meeting") stay in the owning service, which combines them with
 * `can(...)`.
 */
@Injectable()
export class WorkspacePolicy {
  private static readonly ROLE_CAPABILITIES: Record<
    WorkspaceAction,
    readonly WorkspaceRole[]
  > = {
    'workspace:update': ['OWNER', 'ADMIN'],
    'workspace:delete': ['OWNER'],
    'workspace:manageMembers': ['OWNER', 'ADMIN'],
    'meeting:deleteAny': ['OWNER', 'ADMIN'],
  };

  /** Non-throwing check: may a member with `role` perform `action`? */
  can(action: WorkspaceAction, role: WorkspaceRole): boolean {
    return WorkspacePolicy.ROLE_CAPABILITIES[action].includes(role);
  }

  /** Throwing variant used at call sites that gate an operation. */
  assert(action: WorkspaceAction, role: WorkspaceRole): void {
    if (!this.can(action, role)) {
      throw new ForbiddenException('Insufficient workspace permissions');
    }
  }
}
