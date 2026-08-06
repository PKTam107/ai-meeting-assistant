import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

import { ActionItemStatus } from '../../../../generated/prisma/client';

export class CreateActionItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  content: string;

  /** Must be a member of the meeting's workspace (validated in the service). */
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsEnum(ActionItemStatus)
  status?: ActionItemStatus;
}
