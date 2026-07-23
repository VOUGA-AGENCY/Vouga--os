import type { ActiveMember } from "@/application/members/contracts";
import type { Sprint, SprintClosureDisposition, ValidSprintValues } from "@/domain/sprints/sprint";
import type { TaskStatus } from "@/domain/tasks/task";

export type SprintTaskOption = Readonly<{ id: string; title: string; ownerDisplayName: string; status: TaskStatus }>;
export type SprintFormOptions = Readonly<{ members: readonly ActiveMember[]; tasks: readonly SprintTaskOption[] }>;
export interface SprintTaskDirectory {
  listTasks(): Promise<SprintTaskOption[]>;
  tasksExist(ids: readonly string[]): Promise<boolean>;
}
export interface SprintRepository {
  findById(id: string): Promise<Sprint | null>;
  create(values: ValidSprintValues): Promise<Sprint>;
  activate(sprint: Sprint): Promise<Sprint>;
  cancel(sprint: Sprint): Promise<Sprint>;
  addTasks(sprint: Sprint, taskIds: readonly string[]): Promise<Sprint>;
  removeTask(sprint: Sprint, taskId: string): Promise<Sprint>;
  close(sprint: Sprint, actualResult: string, learning: string, dispositions: Readonly<Record<string, SprintClosureDisposition>>): Promise<Sprint>;
}
