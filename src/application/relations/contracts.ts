import type { ActiveMember } from "@/application/members/contracts";
import type {
  Contact,
  ContactChannel,
  ContactDirection,
  ValidContactValues,
} from "@/domain/relations/contact";
import type { ProspectingStage } from "@/domain/companies/company";

export type RelationCompanyOption = Readonly<{ id: string; name: string }>;
export interface ContactRepository {
  create(values: ValidContactValues): Promise<Contact>;
  findById(id: string): Promise<Contact | null>;
  update(contact: Contact): Promise<Contact>;
  setStrategic(id: string, strategicAt: string | null): Promise<void>;
  archive(id: string): Promise<void>;
  delete(id: string): Promise<void>;
  createTemplate(values: {
    name: string;
    channel: ContactChannel;
    situation: string;
    body: string;
    createdByMemberId: string;
  }): Promise<string>;
  recordProspectingTouch(values: {
    companyId: string;
    contactId: string;
    channel: ContactChannel;
    note: string;
    nextStep: string | null;
    followUpAt: string | null;
  }): Promise<void>;
  recordContactInteraction(values: {
    companyId: string;
    contactId: string | null;
    channel: ContactChannel;
    body: string;
    sourceTemplateId: string | null;
    stage: ProspectingStage;
  }): Promise<string>;
  createInteraction(values: {
    companyId: string;
    contactId: string | null;
    direction: ContactDirection;
    channel: ContactChannel;
    body: string;
    occurredAt: string;
    replyToInteractionId: string | null;
    sourceTemplateId: string | null;
    recordedByMemberId: string;
  }): Promise<string>;
}
export interface RelationsDirectory {
  listMembers(): Promise<ActiveMember[]>;
  isActiveMember(id: string): Promise<boolean>;
  listCompanies(): Promise<RelationCompanyOption[]>;
  companyExists(id: string): Promise<boolean>;
}
