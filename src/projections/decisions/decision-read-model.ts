import type {
  DecisionReviewEffect,
  DecisionStatus,
} from "@/domain/decisions/decision";

export type RelatedDecision = Readonly<{
  id: string;
  title: string;
  status: DecisionStatus;
  effect: DecisionReviewEffect;
}>;

export type DecisionListItem = Readonly<{
  id: string;
  title: string;
  choice: string;
  status: DecisionStatus;
  authorityDisplayName: string;
  decidedOn: string;
  originMeetingId: string | null;
  originMeetingTitle: string | null;
  updatedAt: string;
}>;

export type DecisionContextLink = Readonly<{ id: string; label: string }>;

export type DecisionDetail = DecisionListItem &
  Readonly<{
    reason: string;
    alternatives: string | null;
    impact: string;
    authorityMemberId: string;
    originMeetingId: string | null;
    companies: readonly DecisionContextLink[];
    meetings: readonly DecisionContextLink[];
    tasks: readonly DecisionContextLink[];
    previous: RelatedDecision | null;
    revisions: readonly RelatedDecision[];
    createdAt: string;
    updatedAt: string;
  }>;

export interface DecisionReadModel {
  list(): Promise<DecisionListItem[]>;
  listByCompany(companyId: string): Promise<DecisionListItem[]>;
  listByMeeting(meetingId: string): Promise<DecisionListItem[]>;
  listByTask(taskId: string): Promise<DecisionListItem[]>;
  findById(id: string): Promise<DecisionDetail | null>;
}
