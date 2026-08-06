export type MeetingStatus =
  | 'UPLOADED'
  | 'PROCESSING'
  | 'TRANSCRIBED'
  | 'SUMMARIZED'
  | 'FAILED';

/** Lifecycle of the async AI artifacts (transcript, summary). */
export type ProcessingStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export type ActionItemStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE';

export interface Meeting {
  id: string;
  workspaceId: string;
  uploadedById: string;
  title: string;
  description: string | null;
  status: MeetingStatus;
  originalName: string;
  mimeType: string;
  fileSize: number;
  durationSec: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Transcript {
  id: string;
  meetingId: string;
  status: ProcessingStatus;
  language: string | null;
  text: string | null;
  segments: unknown | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Summary {
  id: string;
  meetingId: string;
  status: ProcessingStatus;
  content: string | null;
  model: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ActionItem {
  id: string;
  meetingId: string;
  content: string;
  assigneeId: string | null;
  dueDate: string | null;
  status: ActionItemStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMeetingRequest {
  title: string;
  description?: string;
}

export interface CreateActionItemRequest {
  content: string;
  assigneeId?: string;
  dueDate?: string;
  status?: ActionItemStatus;
}
