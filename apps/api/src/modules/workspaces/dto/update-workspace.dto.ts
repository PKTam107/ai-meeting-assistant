import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateWorkspaceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;
}
