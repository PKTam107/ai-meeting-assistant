import type { JobsOptions } from 'bullmq';

/**
 * Queue names and payloads, shared by the producer (API) and the consumer
 * (worker). Both processes import from here so a rename cannot drift: the
 * queue is only a string to Redis, and a typo would simply mean the job is
 * enqueued somewhere nobody is listening.
 */

export const MEDIA_METADATA_QUEUE = 'media-metadata';

/**
 * Where a job goes once it has exhausted its retries, or failed for a reason
 * retrying cannot fix. BullMQ already keeps failed jobs in its own set; this
 * queue exists so a dead job is a *thing someone can look at and replay*
 * rather than a row in an internal structure.
 */
export const MEDIA_METADATA_DEAD_LETTER_QUEUE = 'media-metadata-dead-letter';

export interface MediaMetadataJob {
  meetingId: string;
}

export interface DeadLetteredMediaMetadataJob extends MediaMetadataJob {
  /** Message of the error that killed the job, for whoever reads the queue. */
  reason: string;
  attemptsMade: number;
  /** `false` when the job died on a permanent error before using its retries. */
  retriesExhausted: boolean;
  failedAt: string;
}

/**
 * One attempt is immediate, then 2s, then 4s. Short on purpose: probing media
 * is fast, so a job that has not succeeded within a few seconds of retrying is
 * far more likely to be broken input than a blip.
 */
export const MEDIA_METADATA_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2_000 },
  // Completed jobs are noise once the meeting row carries the result.
  removeOnComplete: { age: 3_600, count: 100 },
  // Failures are kept for a day: the dead-letter queue holds the summary, this
  // holds the full job with its stack traces.
  removeOnFail: { age: 86_400 },
};
