import type { ActiveMember } from "@/application/members/contracts";
import type { Decision, DecisionRevision, ValidDecisionValues } from "@/domain/decisions/decision";
import type { TaskStatus } from "@/domain/tasks/task";

export type DecisionCompanyOption = Readonly<{
  id: string;
  name: string;
  archived: boolean;
}>;

export type DecisionMeetingOption = Readonly<{
  id: string;
  title: string;
  startsAt: string;
}>;

export type DecisionTaskOption = Readonly<{
  id: string;
  title: string;
  status: TaskStatus;
}>;

export interface DecisionRepository {
  findById(id: string): Promise<Decision | null>;
  create(
    id: string,
    values: ValidDecisionValues,
    revision: DecisionRevision | null,
  ): Promise<Decision>;
}

export interface DecisionContextDirectory {
  listCompanies(): Promise<DecisionCompanyOption[]>;
  listMeetings(): Promise<DecisionMeetingOption[]>;
  listTasks(): Promise<DecisionTaskOption[]>;
  companiesExist(ids: readonly string[]): Promise<boolean>;
  meetingsExist(ids: readonly string[]): Promise<boolean>;
  tasksExist(ids: readonly string[]): Promise<boolean>;
}

export type DecisionFormOptions = Readonly<{
  members: readonly ActiveMember[];
  companies: readonly DecisionCompanyOption[];
  meetings: readonly DecisionMeetingOption[];
  tasks: readonly DecisionTaskOption[];
}>;
