import type {
  ContactChannel,
  ContactDirection,
  ContactRole,
  ContactStatus,
} from "@/domain/relations/contact";
import type { ProspectingStage } from "@/domain/companies/company";
export type ContactListItem = Readonly<{
  id: string;
  displayName: string;
  companyName: string | null;
  companyId: string | null;
  ownerDisplayName: string;
  relationshipRole: ContactRole;
  jobTitle: string | null;
  email: string | null;
  linkedinUrl: string | null;
  phone: string | null;
  importantContext: string | null;
  avatarUrl: string | null;
  strategicAt: string | null;
  status: ContactStatus;
  lastContactAt: string | null;
  hasReplied: boolean;
}>;
export type ContactInteractionItem = Readonly<{
  id: string;
  direction: ContactDirection;
  channel: ContactChannel;
  body: string;
  occurredAt: string;
  replyToInteractionId: string | null;
  recorderName: string;
  hasReply: boolean;
}>;
export type ContactDetail = ContactListItem &
  Readonly<{
    ownerMemberId: string;
    phone: string | null;
    importantContext: string | null;
    meetings: readonly { id: string; title: string; startsAt: string; status: string }[];
    interactions: readonly ContactInteractionItem[];
  }>;
export type MessageTemplateItem = Readonly<{
  id: string;
  name: string;
  channel: ContactChannel;
  situation: string;
  body: string;
  status: "active" | "archived";
}>;
export type ContactSegment = "prospecting" | "internal";
export type ContactPipelineRow = Readonly<{
  companyId: string;
  companyName: string;
  stage: ProspectingStage;
  segment: ContactSegment;
  primaryContactId: string | null;
  primaryContactName: string | null;
  primaryContactAvatarUrl: string | null;
  contacts: readonly {
    id: string;
    displayName: string;
    jobTitle: string | null;
    avatarUrl: string | null;
    relationshipRole: ContactRole;
  }[];
  lastContact: Readonly<{
    channel: ContactChannel;
    body: string;
    occurredAt: string;
  }> | null;
  nextStep: Readonly<{ id: string; title: string; dueAt: string | null }> | null;
}>;
export interface RelationsReadModel {
  listContactPipeline(): Promise<ContactPipelineRow[]>;
  listContacts(): Promise<ContactListItem[]>;
  findContact(id: string): Promise<ContactDetail | null>;
  listTemplates(): Promise<MessageTemplateItem[]>;
}
