import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';

import { ActionItemStatus } from '../../../../generated/prisma/client';

export class UpdateActionItemDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  content?: string;

  /** Pass `null` to unassign, a uuid to (re)assign, or omit to leave unchanged. */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  assigneeId?: string | null;

  /** Pass `null` to clear the due date, omit to leave unchanged. */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsDateString()
  dueDate?: string | null;

  @IsOptional()
  @IsEnum(ActionItemStatus)
  status?: ActionItemStatus;
}
