import { Module } from '@nestjs/common';

import { MeetingsModule } from '@/modules/meetings/meetings.module';

import { TranscriptsController } from './controllers/transcripts.controller';
import { TranscriptsService } from './services/transcripts.service';
import { TranscriptRepository } from './repositories/transcript.repository';

@Module({
  // MeetingsModule exports MeetingsService for the meeting-access check.
  imports: [MeetingsModule],
  controllers: [TranscriptsController],
  providers: [TranscriptsService, TranscriptRepository],
})
export class TranscriptsModule {}
