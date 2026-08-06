import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Metadata fields submitted alongside the uploaded file (multipart form).
 * The file itself is handled separately via `@UploadedFile()`.
 */
export class CreateMeetingDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
