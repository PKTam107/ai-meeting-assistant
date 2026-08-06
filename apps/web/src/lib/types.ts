// Shapes mirror the Prisma models and DTOs exposed by the NestJS API.

export interface User {
  id: string;
  email: string;
}

export type WorkspaceRole = "OWNER" | "ADMIN" | "MEMBER";

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  createdAt: string;
  user?: User;
}

export type MeetingStatus =
  | "UPLOADED"
  | "PROCESSING"
  | "TRANSCRIBED"
  | "SUMMARIZED"
  | "FAILED";

export type ProcessingStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

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
  // Present on the single-meeting endpoint.
  transcript?: { id: string; status: ProcessingStatus } | null;
  summary?: { id: string; status: ProcessingStatus } | null;
  _count?: { actionItems: number };
}

export interface Transcript {
  id: string;
  meetingId: string;
  status: ProcessingStatus;
  language: string | null;
  text: string | null;
  error: string | null;
}

export interface Summary {
  id: string;
  meetingId: string;
  status: ProcessingStatus;
  content: string | null;
  model: string | null;
  error: string | null;
}

export type ActionItemStatus = "OPEN" | "IN_PROGRESS" | "DONE";

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

export interface AuthResponse {
  user: User;
  accessToken: string;
}
