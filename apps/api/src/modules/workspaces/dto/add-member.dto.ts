import { IsEmail, IsEnum, IsOptional } from 'class-validator';

import { WorkspaceRole } from '../../../../generated/prisma/client';

export class AddMemberDto {
  @IsEmail()
  email: string;

  /** OWNER is reserved for the creator and rejected by the service. */
  @IsOptional()
  @IsEnum(WorkspaceRole)
  role?: WorkspaceRole;
}
