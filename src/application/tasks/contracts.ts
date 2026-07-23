import type { ActiveMember } from "@/application/members/contracts";
import type { Task, ValidTaskValues } from "@/domain/tasks/task";
export type TaskCompanyOption = Readonly<{ id: string; name: string; archived: boolean }>;
export type TaskMeetingOption = Readonly<{
  id: string;
  title: string;
  startsAt: string;
  kind: "meeting" | "event";
}>;
export type TaskDecisionOption = Readonly<{ id: string; title: string }>;
export type TaskGoogleEventOption = Readonly<{
  memberId: string;
  calendarId: string;
  eventId: string;
  title: string;
  startsAt: string;
}>;
export interface TaskRepository {
  findById(id: string): Promise<Task | null>;
  create(values: ValidTaskValues): Promise<Task>;
  update(task: Task, values: ValidTaskValues): Promise<Task>;
  saveState(task: Task): Promise<Task>;
  delete(id: string): Promise<void>;
}
export interface TaskContextDirectory {
  listCompanies(): Promise<TaskCompanyOption[]>;
  listMeetings(): Promise<TaskMeetingOption[]>;
  companiesExist(ids: readonly string[]): Promise<boolean>;
  meetingsExist(ids: readonly string[]): Promise<boolean>;
  decisionsExist(ids: readonly string[]): Promise<boolean>;
}
export type TaskFormOptions = Readonly<{
  members: readonly ActiveMember[];
  companies: readonly TaskCompanyOption[];
  meetings: readonly TaskMeetingOption[];
  googleEvents: readonly TaskGoogleEventOption[];
}>;
