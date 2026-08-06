/**
 * Central React Query key factory.
 *
 * Keeping every key in one place keeps invalidation across features consistent
 * — e.g. renaming a workspace touches both `workspace(id)` and `workspaces()`,
 * and an action-items component (a different feature) can invalidate the exact
 * same key the meetings feature reads from. The string shapes match what the
 * pages used before the refactor, so cache behavior is unchanged.
 */
export const queryKeys = {
  workspaces: () => ["workspaces"] as const,
  workspace: (id: string) => ["workspace", id] as const,
  members: (workspaceId: string) => ["members", workspaceId] as const,
  meetings: (workspaceId: string) => ["meetings", workspaceId] as const,
  meeting: (id: string) => ["meeting", id] as const,
  transcript: (meetingId: string) => ["transcript", meetingId] as const,
  summary: (meetingId: string) => ["summary", meetingId] as const,
  actionItems: (meetingId: string) => ["action-items", meetingId] as const,
};
