import type { ReadStream } from 'fs';
// Loads the `Express.Multer.File` global type augmentation (type-only, no
// runtime require). The named `File` member isn't exported by the multer
// module — the file type lives on the global Express.Multer namespace.
import type {} from 'multer';

import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Queue } from 'bullmq';

import { StorageService } from '@/common/storage/storage.service';
import {
  MEDIA_METADATA_JOB_OPTIONS,
  MEDIA_METADATA_QUEUE,
  type MediaMetadataJob,
} from '@/queue/queues';
import { WorkspacesService } from '@/modules/workspaces/services/workspaces.service';

import {
  MeetingRepository,
  MeetingWithArtifacts,
} from '../repositories/meeting.repository';
import { CreateMeetingDto } from '../dto/create-meeting.dto';
import { UpdateMeetingDto } from '../dto/update-meeting.dto';

import type { Meeting } from '../../../../generated/prisma/client';

@Injectable()
export class MeetingsService {
  private readonly logger = new Logger(MeetingsService.name);

  constructor(
    private readonly meetingRepository: MeetingRepository,
    private readonly workspacesService: WorkspacesService,
    private readonly storageService: StorageService,
    private readonly configService: ConfigService,
    @InjectQueue(MEDIA_METADATA_QUEUE)
    private readonly mediaMetadataQueue: Queue<MediaMetadataJob>,
  ) {}

  async create(
    workspaceId: string,
    userId: string,
    dto: CreateMeetingDto,
    file: Express.Multer.File | undefined,
  ): Promise<Meeting> {
    await this.workspacesService.assertMember(workspaceId, userId);
    this.validateFile(file);

    const stored = await this.storageService.save({
      buffer: file!.buffer,
      originalName: file!.originalname,
      prefix: `meetings/${workspaceId}`,
    });

    const meeting = await this.meetingRepository.create({
      workspaceId,
      uploadedById: userId,
      title: dto.title,
      description: dto.description,
      storageKey: stored.key,
      originalName: file!.originalname,
      mimeType: file!.mimetype,
      fileSize: stored.size,
    });

    await this.enqueueMetadataProbe(meeting.id);

    return meeting;
  }

  /**
   * Hand the meeting to the worker for inspection.
   *
   * The upload itself has already succeeded at this point — the bytes are
   * stored and the row exists — so a Redis outage must not turn it into a 500.
   * The cost of that choice is a meeting stuck at UPLOADED with no job behind
   * it; re-running the probe needs an operator until there is an endpoint for
   * it.
   */
  private async enqueueMetadataProbe(meetingId: string): Promise<void> {
    try {
      await this.mediaMetadataQueue.add(
        'probe',
        { meetingId },
        {
          ...MEDIA_METADATA_JOB_OPTIONS,
          // One job per meeting. If this upload is somehow retried, BullMQ
          // drops the duplicate instead of probing the same file twice.
          jobId: meetingId,
        },
      );
    } catch (error) {
      this.logger.error(
        `Meeting ${meetingId} was stored but could not be queued for probing`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async findAllForWorkspace(
    workspaceId: string,
    userId: string,
  ): Promise<Meeting[]> {
    await this.workspacesService.assertMember(workspaceId, userId);
    return this.meetingRepository.listByWorkspace(workspaceId);
  }

  async findOne(id: string, userId: string): Promise<MeetingWithArtifacts> {
    const meeting = await this.meetingRepository.findByIdWithArtifacts(id);
    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }
    await this.workspacesService.assertMember(meeting.workspaceId, userId);
    return meeting;
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateMeetingDto,
  ): Promise<Meeting> {
    await this.loadAccessible(id, userId);
    return this.meetingRepository.update(id, {
      title: dto.title,
      description: dto.description,
    });
  }

  async remove(id: string, userId: string): Promise<void> {
    const meeting = await this.loadAccessible(id, userId);

    // Only the uploader, or a member whose role may delete any meeting, may
    // delete it. The role rule lives in WorkspacePolicy; ownership is the
    // resource-specific part that stays here.
    if (meeting.uploadedById !== userId) {
      await this.workspacesService.assertCan(
        meeting.workspaceId,
        userId,
        'meeting:deleteAny',
      );
    }

    await this.meetingRepository.delete(id);
    // Best-effort: the DB row is already gone, so a storage error must not fail
    // the request.
    await this.storageService.delete(meeting.storageKey).catch(() => undefined);
  }

  /** Resolve a meeting plus a readable stream of its stored file. */
  async getFile(
    id: string,
    userId: string,
  ): Promise<{ meeting: Meeting; stream: ReadStream }> {
    const meeting = await this.loadAccessible(id, userId);

    if (!(await this.storageService.exists(meeting.storageKey))) {
      throw new NotFoundException('Stored file is missing');
    }

    return {
      meeting,
      stream: this.storageService.createReadStream(meeting.storageKey),
    };
  }

  /**
   * Load a meeting and confirm the requester is a member of its workspace.
   * Shared by the per-meeting routes so the access check lives in one place.
   */
  async loadAccessible(id: string, userId: string): Promise<Meeting> {
    const meeting = await this.meetingRepository.findById(id);
    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }
    await this.workspacesService.assertMember(meeting.workspaceId, userId);
    return meeting;
  }

  private validateFile(file: Express.Multer.File | undefined): void {
    if (!file) {
      throw new BadRequestException('A meeting file is required');
    }

    const isAudioOrVideo =
      file.mimetype.startsWith('audio/') || file.mimetype.startsWith('video/');
    if (!isAudioOrVideo) {
      throw new ForbiddenException('Only audio or video files are accepted');
    }

    const maxBytes =
      this.configService.getOrThrow<number>('MAX_UPLOAD_SIZE_MB') * 1024 * 1024;
    if (file.size > maxBytes) {
      throw new PayloadTooLargeException('Uploaded file is too large');
    }
  }
}
