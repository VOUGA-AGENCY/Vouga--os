import type { MeetingKind, MeetingStatus, VacationTone } from "@/domain/meetings/meeting";

export type MeetingListItem = Readonly<{
  id: string;
  kind: MeetingKind;
  calendarTone: VacationTone | null;
  title: string;
  purpose: string | null;
  status: MeetingStatus;
  startsAt: string;
  endsAt: string;
  closerMemberId: string | null;
  closerDisplayName: string | null;
  participantMembers: readonly Readonly<{ memberId: string; displayName: string }>[];
  companyNames: readonly string[];
  updatedAt: string;
}>;

export type MeetingParticipantView = Readonly<{
  kind: "internal" | "external";
  displayName: string;
  email: string | null;
  contactId: string | null;
}>;

export type MeetingDetail = MeetingListItem &
  Readonly<{
    intendedResult: string | null;
    closerMemberId: string | null;
    agenda: string | null;
    notes: string | null;
    openQuestions: string | null;
    conclusion: string | null;
    closedAt: string | null;
    participants: readonly MeetingParticipantView[];
    participantMemberIds: readonly string[];
    participantContactIds: readonly string[];
    externalParticipantNames: readonly string[];
    companyIds: readonly string[];
    taskIds: readonly string[];
    tasks: readonly Readonly<{ id: string; title: string }>[];
    createdAt: string;
    updatedAt: string;
  }>;

export interface MeetingReadModel {
  list(now: string): Promise<MeetingListItem[]>;
  listByCompany(companyId: string, now: string): Promise<MeetingListItem[]>;
  findById(id: string, now: string): Promise<MeetingDetail | null>;
}
