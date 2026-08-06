import type { UserDto } from './auth';

export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  createdAt: string;
  /** Present on the list-members endpoint. */
  user?: UserDto;
}

export interface CreateWorkspaceRequest {
  name: string;
}

export interface AddMemberRequest {
  email: string;
  role?: Exclude<WorkspaceRole, 'OWNER'>;
}
