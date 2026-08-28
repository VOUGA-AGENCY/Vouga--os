import {
  CONTACT_CHANNELS,
  validateContactValues,
  ContactValidationError,
  type ContactChannel,
  type ContactDirection,
  type ContactRole,
  type ContactValues,
} from "@/domain/relations/contact";
import { PROSPECTING_STAGES, type ProspectingStage } from "@/domain/companies/company";
import type { ContactRepository, RelationsDirectory } from "./contracts";

export class RelationsService {
  constructor(
    private repository: ContactRepository,
    private directory: RelationsDirectory,
  ) {}
  listFormOptions() {
    return Promise.all([this.directory.listMembers(), this.directory.listCompanies()]).then(
      ([members, companies]) => ({ members, companies }),
    );
  }
  async createContact(values: ContactValues) {
    const valid = validateContactValues(values);
    await this.assertRefs(valid.ownerMemberId, valid.companyId);
    return this.repository.create(valid);
  }
  async updateContact(id: string, values: ContactValues) {
    const existing = await this.repository.findById(id);
    if (!existing) throw new ContactValidationError("O Contact não existe.");
    const valid = validateContactValues(values);
    await this.assertRefs(valid.ownerMemberId, valid.companyId);
    return this.repository.update({ ...existing, ...valid });
  }
  setStrategic(id: string, enabled: boolean) {
    return this.repository.setStrategic(id, enabled ? new Date().toISOString() : null);
  }
  archiveContact(id: string) {
    return this.repository.archive(id);
  }
  deleteContact(id: string) {
    return this.repository.delete(id);
  }
  async createTemplate(values: {
    name: string;
    channel: ContactChannel;
    situation: string;
    body: string;
    memberId: string;
  }) {
    const name = values.name.trim(),
      situation = values.situation.trim(),
      body = values.body.trim();
    if (!name || !situation || !body)
      throw new ContactValidationError("Nome, situação e texto são obrigatórios.");
    return this.repository.createTemplate({
      name,
      channel: values.channel,
      situation,
      body,
      createdByMemberId: values.memberId,
    });
  }
  async recordProspectingTouch(values: {
    companyId: string;
    contactId: string;
    channel: ContactChannel;
    note: string;
    nextStep?: string | null;
    followUpAt?: string | null;
  }) {
    const note = values.note.trim();
    const nextStep = values.nextStep?.trim() || null;
    if (!note) throw new ContactValidationError("Regista o resultado do contacto.");
    if (nextStep && !values.followUpAt)
      throw new ContactValidationError("Escolhe a data do follow-up.");
    if (values.followUpAt && Number.isNaN(Date.parse(values.followUpAt)))
      throw new ContactValidationError("A data do follow-up não é válida.");
    return this.repository.recordProspectingTouch({
      ...values,
      note,
      nextStep,
      followUpAt: values.followUpAt ? new Date(values.followUpAt).toISOString() : null,
    });
  }
  async recordContactInteraction(values: {
    companyId: string;
    contactId: string | null;
    channel: ContactChannel;
    body: string;
    sourceTemplateId?: string | null;
    stage: ProspectingStage;
  }) {
    const companyId = values.companyId.trim();
    const contactId = values.contactId?.trim() || null;
    const body = values.body.trim();
    if (!companyId) throw new ContactValidationError("Seleciona uma Organisation.");
    if (!body) throw new ContactValidationError("Escreve a mensagem ou escolhe um guião.");
    if (!CONTACT_CHANNELS.includes(values.channel))
      throw new ContactValidationError("O tipo de interação não é válido.");
    if (!PROSPECTING_STAGES.includes(values.stage))
      throw new ContactValidationError("O estado da relação não é válido.");
    return this.repository.recordContactInteraction({
      ...values,
      companyId,
      contactId,
      body,
      sourceTemplateId: values.sourceTemplateId || null,
    });
  }
  async createInteraction(values: {
    companyId: string;
    contactId: string | null;
    direction: ContactDirection;
    channel: ContactChannel;
    body: string;
    occurredAt: string;
    replyToInteractionId?: string | null;
    sourceTemplateId?: string | null;
    memberId: string;
  }) {
    const companyId = values.companyId.trim();
    const contactId = values.contactId?.trim() || null;
    const body = values.body.trim();
    if (!companyId) throw new ContactValidationError("Seleciona uma Organisation.");
    if (!body) throw new ContactValidationError("A mensagem ou nota da chamada é obrigatória.");
    if (Number.isNaN(Date.parse(values.occurredAt)))
      throw new ContactValidationError("A data do contacto não é válida.");
    return this.repository.createInteraction({
      ...values,
      companyId,
      contactId,
      body,
      occurredAt: new Date(values.occurredAt).toISOString(),
      replyToInteractionId: values.replyToInteractionId || null,
      sourceTemplateId: values.sourceTemplateId || null,
      recordedByMemberId: values.memberId,
    });
  }
  private async assertRefs(ownerId: string, companyId: string | null) {
    if (!(await this.directory.isActiveMember(ownerId)))
      throw new ContactValidationError("Seleciona um owner ativo.");
    if (companyId && !(await this.directory.companyExists(companyId)))
      throw new ContactValidationError("A organização não existe.");
  }
}

export function contactValuesFromInput(input: Record<string, string | null>): ContactValues {
  return {
    displayName: input.display_name ?? "",
    companyId: input.company_id,
    ownerMemberId: input.owner_member_id ?? "",
    relationshipRole: (input.relationship_role ?? "other") as ContactRole,
    jobTitle: input.job_title,
    email: input.email,
    linkedinUrl: input.linkedin_url,
    phone: input.phone,
    avatarUrl: input.avatar_url,
    importantContext: input.important_context,
  };
}
export function getRelationsErrorMessage(error: unknown) {
  return error instanceof ContactValidationError
    ? error.message
    : "Não foi possível guardar esta relação.";
}
