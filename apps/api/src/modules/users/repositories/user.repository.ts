import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/database/prisma.service';

import type { User } from '../../../../generated/prisma/client';

export interface CreateUserData {
  email: string;
  passwordHash: string;
}

/**
 * Data-access layer for the User aggregate.
 * AuthService depends on this, not on PrismaService directly, so business
 * logic stays decoupled from the ORM (easier to test and to swap later).
 */
@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  create(data: CreateUserData): Promise<User> {
    return this.prisma.user.create({ data });
  }
}
