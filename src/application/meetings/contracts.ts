import type { ActiveMember } from "@/application/members/contracts";
import type { Meeting, ValidMeetingValues } from "@/domain/meetings/meeting";

export type CompanyOption = Readonly<{ id: string; name: string; archived: boolean }>;
export type MeetingTaskOption = Readonly<{ id: string; title: string; status: string }>;
export type ContactOption = Readonly<{
  id: string;
  displayName: string;
  companyName: string | null;
}>;

export interface MeetingRepository {
  findById(id: string): Promise<Meeting | null>;
  create(values: ValidMeetingValues): Promise<Meeting>;
  update(meeting: Meeting, values: ValidMeetingValues): Promise<Meeting>;
  saveState(meeting: Meeting): Promise<Meeting>;
  close(meeting: Meeting): Promise<Meeting>;
  delete(id: string): Promise<void>;
}
export interface MeetingContextDirectory {
  listCompanies(): Promise<CompanyOption[]>;
  companiesExist(ids: readonly string[]): Promise<boolean>;
  listTasks(): Promise<MeetingTaskOption[]>;
  tasksExist(ids: readonly string[]): Promise<boolean>;
  listContacts(): Promise<ContactOption[]>;
  contactsExist(ids: readonly string[]): Promise<boolean>;
}
export type MeetingFormOptions = Readonly<{
  members: readonly ActiveMember[];
  companies: readonly CompanyOption[];
  tasks: readonly MeetingTaskOption[];
}>;
