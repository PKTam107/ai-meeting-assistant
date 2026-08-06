import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/database/prisma.service';

import type { Workspace } from '../../../../generated/prisma/client';

@Injectable()
export class WorkspaceRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Create a workspace and seed its creator as the OWNER member in one write. */
  createWithOwner(data: { name: string; ownerId: string }): Promise<Workspace> {
    return this.prisma.workspace.create({
      data: {
        name: data.name,
        ownerId: data.ownerId,
        members: {
          create: { userId: data.ownerId, role: 'OWNER' },
        },
      },
    });
  }

  /** Every workspace the user belongs to (as owner or member). */
  findAllForUser(userId: string): Promise<Workspace[]> {
    return this.prisma.workspace.findMany({
      where: { members: { some: { userId } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(id: string): Promise<Workspace | null> {
    return this.prisma.workspace.findUnique({ where: { id } });
  }

  update(id: string, data: { name: string }): Promise<Workspace> {
    return this.prisma.workspace.update({ where: { id }, data });
  }

  delete(id: string): Promise<Workspace> {
    return this.prisma.workspace.delete({ where: { id } });
  }
}
