import type { SprintClosureDisposition, SprintStatus } from "@/domain/sprints/sprint";
import type { TaskStatus } from "@/domain/tasks/task";

export type SprintTaskItem = Readonly<{ taskId: string; title: string; expectedResult: string; status: TaskStatus; ownerDisplayName: string; dueAt: string | null; blockedReason: string | null; blockedNextMove: string | null; committedAt: string; closureDisposition: SprintClosureDisposition | null }>;
export type SprintListItem = Readonly<{ id: string; name: string; intendedResult: string; status: SprintStatus; ownerMemberId: string; ownerDisplayName: string; startsOn: string; endsOn: string; taskCount: number; completedTaskCount: number; blockedTaskCount: number }>;
export type SprintDetail = SprintListItem & Readonly<{ materialRisks: string | null; actualResult: string | null; learning: string | null; tasks: readonly SprintTaskItem[]; createdAt: string; updatedAt: string }>;
export interface SprintReadModel { list(): Promise<SprintListItem[]>; listByTaskIds(taskIds: readonly string[]): Promise<SprintListItem[]>; findById(id: string): Promise<SprintDetail | null>; }
