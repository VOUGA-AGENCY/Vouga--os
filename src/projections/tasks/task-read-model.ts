import type { TaskOrigin, TaskPurpose, TaskStatus } from "@/domain/tasks/task";
export type TaskListItem = Readonly<{
  id: string;
  title: string;
  expectedResult: string | null;
  purpose: TaskPurpose;
  status: TaskStatus;
  ownerMemberId: string;
  ownerDisplayName: string;
  dueAt: string | null;
  blockedReason: string | null;
  blockedNextMove: string | null;
  originLabel: string;
  originMeetingId: string | null;
  originDecisionId: string | null;
  companyIds: readonly string[];
  companyNames: readonly string[];
  meetingIds: readonly string[];
  meetingTitles: readonly string[];
  decisionIds: readonly string[];
  decisionTitles: readonly string[];
  updatedAt: string;
}>;
export type TaskDetail = TaskListItem &
  Readonly<{
    completionNote: string | null;
    completedAt: string | null;
    origin: TaskOrigin;
    createdAt: string;
    updatedAt: string;
  }>;
export interface TaskReadModel {
  list(): Promise<TaskListItem[]>;
  listByCompany(companyId: string): Promise<TaskListItem[]>;
  listByMeeting(meetingId: string): Promise<TaskListItem[]>;
  findById(id: string): Promise<TaskDetail | null>;
}
