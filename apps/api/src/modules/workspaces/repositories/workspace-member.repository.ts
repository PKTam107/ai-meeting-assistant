import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/database/prisma.service';

import type {
  Prisma,
  WorkspaceMember,
  WorkspaceRole,
} from '../../../../generated/prisma/client';

/** A membership row joined with the member's public user fields. */
export type WorkspaceMemberWithUser = Prisma.WorkspaceMemberGetPayload<{
  include: { user: { select: { id: true; email: true } } };
}>;

@Injectable()
export class WorkspaceMemberRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByWorkspaceAndUser(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMember | null> {
    return this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
  }

  listByWorkspace(workspaceId: string): Promise<WorkspaceMemberWithUser[]> {
    return this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: { select: { id: true, email: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  create(data: {
    workspaceId: string;
    userId: string;
    role: WorkspaceRole;
  }): Promise<WorkspaceMember> {
    return this.prisma.workspaceMember.create({ data });
  }

  delete(workspaceId: string, userId: string): Promise<WorkspaceMember> {
    return this.prisma.workspaceMember.delete({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
  }
}
