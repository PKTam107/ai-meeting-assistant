import { Module } from '@nestjs/common';

import { MeetingsModule } from '@/modules/meetings/meetings.module';

import { SummariesController } from './controllers/summaries.controller';
import { SummariesService } from './services/summaries.service';
import { SummaryRepository } from './repositories/summary.repository';

@Module({
  imports: [MeetingsModule],
  controllers: [SummariesController],
  providers: [SummariesService, SummaryRepository],
})
export class SummariesModule {}
