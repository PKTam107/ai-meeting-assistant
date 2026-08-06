import { Injectable } from '@nestjs/common';

import { UserRepository } from '../repositories/user.repository';
import type { CreateUserData } from '../repositories/user.repository';

import type { User } from '../../../../generated/prisma/client';

/**
 * Owns the User aggregate: lookup and creation today, profile management later.
 * Other modules (auth, workspaces) depend on this service rather than reaching
 * into UserRepository directly, so the data layer stays encapsulated here.
 */
@Injectable()
export class UsersService {
  constructor(private readonly userRepository: UserRepository) {}

  findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }

  findById(id: string): Promise<User | null> {
    return this.userRepository.findById(id);
  }

  create(data: CreateUserData): Promise<User> {
    return this.userRepository.create(data);
  }

  async emailExists(email: string): Promise<boolean> {
    return (await this.userRepository.findByEmail(email)) !== null;
  }
}
