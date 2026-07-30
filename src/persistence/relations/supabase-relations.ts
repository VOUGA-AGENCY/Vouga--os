import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContactRepository, RelationsDirectory } from "@/application/relations/contracts";
import { ContactValidationError } from "@/domain/relations/contact";
import type {
  Contact,
  ContactChannel,
  ContactDirection,
  ContactRole,
  ContactStatus,
  ValidContactValues,
} from "@/domain/relations/contact";
import type { ProspectingStage } from "@/domain/companies/company";
import type {
  ContactDetail,
  ContactInteractionItem,
  ContactListItem,
  ContactPipelineRow,
  MessageTemplateItem,
  RelationsReadModel,
} from "@/projections/relations/relations-read-model";

const CONTACT_SELECT =
  "id,display_name,company_id,owner_member_id,relationship_role,job_title,email,linkedin_url,phone,avatar_url,important_context,strategic_at,status,created_at,updated_at";
type ContactRow = {
  id: string;
  display_name: string;
  company_id: string | null;
  owner_member_id: string;
  relationship_role: ContactRole;
  job_title: string | null;
  email: string | null;
  linkedin_url: string | null;
  phone: string | null;
  avatar_url: string | null;
  important_context: string | null;
  strategic_at: string | null;
  status: ContactStatus;
  created_at: string;
  updated_at: string;
  company?: { name: string } | null;
  owner?: { display_name: string } | null;
};
type InteractionRow = {
  id: string;
  contact_id: string;
  direction: ContactDirection;
  channel: ContactChannel;
  body: string;
  occurred_at: string;
  reply_to_interaction_id: string | null;
  recorder?: { display_name: string } | null;
};
const isMissingSchema = (error: { code?: string } | null) =>
  error?.code === "42P01" || error?.code === "PGRST205" || error?.code === "PGRST200";
const toContact = (row: ContactRow): Contact => ({
  id: row.id,
  displayName: row.display_name,
  companyId: row.company_id,
  ownerMemberId: row.owner_member_id,
  relationshipRole: row.relationship_role,
  jobTitle: row.job_title,
  email: row.email,
  linkedinUrl: row.linkedin_url,
  phone: row.phone,
  avatarUrl: row.avatar_url,
  importantContext: row.important_context,
  strategicAt: row.strategic_at,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});
const rowValues = (v: ValidContactValues) => ({
  display_name: v.displayName,
  company_id: v.companyId,
  owner_member_id: v.ownerMemberId,
  relationship_role: v.relationshipRole,
  job_title: v.jobTitle,
  email: v.email,
  linkedin_url: v.linkedinUrl,
  phone: v.phone,
  avatar_url: v.avatarUrl,
  important_context: v.importantContext,
});

export class SupabaseContactRepository implements ContactRepository {
  constructor(private supabase: SupabaseClient) {}
  async create(values: ValidContactValues) {
    const { data, error } = await this.supabase
      .from("contacts")
      .insert(rowValues(values))
      .select(CONTACT_SELECT)
      .single();
    if (error || !data) throw new Error("Não foi possível criar o Contact.");
    return toContact(data as ContactRow);
  }
  async findById(id: string) {
    const { data, error } = await this.supabase
      .from("contacts")
      .select(CONTACT_SELECT)
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error("Não foi possível carregar o Contact.");
    return data ? toContact(data as ContactRow) : null;
  }
  async update(contact: Contact) {
    const { data, error } = await this.supabase
      .from("contacts")
      .update(rowValues(contact))
      .eq("id", contact.id)
      .eq("status", "active")
      .select(CONTACT_SELECT)
      .single();
    if (error || !data) throw new Error("Não foi possível atualizar o Contact.");
    return toContact(data as ContactRow);
  }
  async setStrategic(id: string, strategicAt: string | null) {
    const { error } = await this.supabase
      .from("contacts")
      .update({ strategic_at: strategicAt })
      .eq("id", id)
      .eq("status", "active");
    if (error) throw new Error("Não foi possível alterar a classificação estratégica.");
  }
  async archive(id: string) {
    const { error } = await this.supabase
      .from("contacts")
      .update({ status: "archived" })
      .eq("id", id);
    if (error) throw new Error("Não foi possível arquivar o Contact.");
  }
  async delete(id: string) {
    const { error } = await this.supabase.rpc("delete_contact_profile", {
      p_contact_id: id,
    });
    if (!error) return;
    if (error.code === "23503")
      throw new ContactValidationError(
        "Este Perfil ainda está ligado a contexto protegido e não pode ser eliminado.",
      );
    if (error.code === "P0002") throw new ContactValidationError("Este Perfil já não existe.");
    if (error.code === "42501")
      throw new ContactValidationError(
        "A sessão atual não tem permissão para eliminar este Perfil. Volta a entrar e tenta novamente.",
      );
    throw new ContactValidationError("Não foi possível eliminar o Perfil.");
  }
  async createTemplate(values: {
    name: string;
    channel: ContactChannel;
    situation: string;
    body: string;
    createdByMemberId: string;
  }) {
    const { data, error } = await this.supabase
      .from("contact_message_templates")
      .insert({
        name: values.name,
        channel: values.channel,
        situation: values.situation,
        body: values.body,
        created_by_member_id: values.createdByMemberId,
      })
      .select("id")
      .single();
    if (error || !data) throw new Error("Não foi possível criar a mensagem.");
    return String(data.id);
  }
  async recordProspectingTouch(values: {
    companyId: string;
    contactId: string;
    channel: ContactChannel;
    note: string;
    nextStep: string | null;
    followUpAt: string | null;
  }) {
    const { error } = await this.supabase.rpc("record_prospecting_touch", {
      p_company_id: values.companyId,
      p_contact_id: values.contactId,
      p_channel: values.channel,
      p_note: values.note,
      p_next_step: values.nextStep,
      p_follow_up_at: values.followUpAt,
    });
    if (error) throw new Error("Não foi possível registar o contacto de prospeção.");
  }
  async recordContactInteraction(values: {
    companyId: string;
    contactId: string;
    channel: ContactChannel;
    body: string;
    sourceTemplateId: string | null;
    stage: ProspectingStage;
  }) {
    const { data, error } = await this.supabase.rpc("record_contact_interaction", {
      p_company_id: values.companyId,
      p_contact_id: values.contactId,
      p_channel: values.channel,
      p_body: values.body,
      p_source_template_id: values.sourceTemplateId,
      p_stage: values.stage,
    });
    if (error || !data) throw new Error("Não foi possível registar a interação.");
    return String(data);
  }
  async createInteraction(values: {
    contactId: string;
    direction: ContactDirection;
    channel: ContactChannel;
    body: string;
    occurredAt: string;
    replyToInteractionId: string | null;
    sourceTemplateId: string | null;
    recordedByMemberId: string;
  }) {
    const { data, error } = await this.supabase
      .from("contact_interactions")
      .insert({
        contact_id: values.contactId,
        direction: values.direction,
        channel: values.channel,
        body: values.body,
        occurred_at: values.occurredAt,
        reply_to_interaction_id: values.replyToInteractionId,
        source_template_id: values.sourceTemplateId,
        recorded_by_member_id: values.recordedByMemberId,
      })
      .select("id")
      .single();
    if (error || !data) throw new Error("Não foi possível registar o contacto.");
    return String(data.id);
  }
}

export class SupabaseRelationsDirectory implements RelationsDirectory {
  constructor(private supabase: SupabaseClient) {}
  async listMembers() {
    const { data, error } = await this.supabase
      .from("members")
      .select("id,display_name,email")
      .eq("is_active", true)
      .order("display_name");
    if (error) throw new Error("Não foi possível carregar os Members.");
    return (data ?? []).map((m) => ({
      id: String(m.id),
      displayName: String(m.display_name),
      email: String(m.email),
    }));
  }
  async isActiveMember(id: string) {
    const { data, error } = await this.supabase
      .from("members")
      .select("id")
      .eq("id", id)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw new Error("Não foi possível validar o owner.");
    return Boolean(data);
  }
  async listCompanies() {
    const { data, error } = await this.supabase
      .from("companies")
      .select("id,name")
      .neq("status", "archived")
      .order("name");
    if (error) throw new Error("Não foi possível carregar as Organizações.");
    return (data ?? []).map((c) => ({ id: String(c.id), name: String(c.name) }));
  }
  async companyExists(id: string) {
    const { data, error } = await this.supabase
      .from("companies")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error("Não foi possível validar a Organização.");
    return Boolean(data);
  }
}

export class SupabaseRelationsReadModel implements RelationsReadModel {
  constructor(private supabase: SupabaseClient) {}
  async listContactPipeline(): Promise<ContactPipelineRow[]> {
    const [companiesResult, contactsResult, interactionsResult, followUpsResult] =
      await Promise.all([
        this.supabase
          .from("companies")
          .select("id,name,prospecting_stage,primary_contact_id,updated_at")
          .not("prospecting_stage", "is", null)
          .neq("status", "archived")
          .order("updated_at", { ascending: false }),
        this.supabase
          .from("contacts")
          .select("id,display_name,job_title,company_id,avatar_url,relationship_role")
          .eq("status", "active"),
        this.supabase
          .from("contact_interactions")
          .select("contact_id,channel,body,occurred_at")
          .order("occurred_at", { ascending: false }),
        this.supabase
          .from("task_companies")
          .select(
            "company_id,task:tasks!task_companies_task_id_fkey(id,title,due_at,status,purpose)",
          ),
      ]);
    if (
      companiesResult.error ||
      contactsResult.error ||
      interactionsResult.error ||
      followUpsResult.error
    )
      throw new Error("Não foi possível carregar a prospeção.");
    const contacts = (contactsResult.data ?? []) as Array<{
      id: string;
      display_name: string;
      job_title: string | null;
      company_id: string | null;
      avatar_url: string | null;
      relationship_role: ContactRole;
    }>;
    const interactions = (interactionsResult.data ?? []) as Array<{
      contact_id: string;
      channel: ContactChannel;
      body: string;
      occurred_at: string;
    }>;
    const followUps = (followUpsResult.data ?? []) as unknown as Array<{
      company_id: string;
      task: {
        id: string;
        title: string;
        due_at: string | null;
        status: string;
        purpose: string;
      } | null;
    }>;
    return (companiesResult.data ?? []).map((company) => {
      const ownContacts = contacts.filter((contact) => contact.company_id === company.id);
      const contactIds = new Set(ownContacts.map((contact) => contact.id));
      const last = interactions.find((interaction) => contactIds.has(interaction.contact_id));
      const next = followUps
        .filter(
          (item) =>
            item.company_id === company.id &&
            item.task?.purpose === "relationship_follow_up" &&
            item.task.status !== "completed" &&
            item.task.status !== "cancelled",
        )
        .map((item) => item.task!)
        .sort((a, b) => (a.due_at ?? "9999").localeCompare(b.due_at ?? "9999"))[0];
      const primary =
        ownContacts.find((contact) => contact.id === company.primary_contact_id) ?? ownContacts[0];
      return {
        companyId: String(company.id),
        companyName: String(company.name),
        stage: company.prospecting_stage as ContactPipelineRow["stage"],
        segment: primary?.relationship_role === "prospect" ? "prospecting" : "internal",
        primaryContactId: primary?.id ?? null,
        primaryContactName: primary?.display_name ?? null,
        primaryContactAvatarUrl: primary?.avatar_url ?? null,
        contacts: ownContacts.map((contact) => ({
          id: contact.id,
          displayName: contact.display_name,
          jobTitle: contact.job_title,
          avatarUrl: contact.avatar_url,
          relationshipRole: contact.relationship_role,
        })),
        lastContact: last
          ? { channel: last.channel, body: last.body, occurredAt: last.occurred_at }
          : null,
        nextStep: next ? { id: next.id, title: next.title, dueAt: next.due_at } : null,
      };
    });
  }
  async listContacts(): Promise<ContactListItem[]> {
    const [contactsResult, interactionsResult] = await Promise.all([
      this.supabase
        .from("contacts")
        .select(
          `${CONTACT_SELECT},company:companies!contacts_company_id_fkey(name),owner:members!contacts_owner_member_id_fkey(display_name)`,
        )
        .order("display_name"),
      this.supabase
        .from("contact_interactions")
        .select("id,contact_id,direction,channel,body,occurred_at,reply_to_interaction_id")
        .order("occurred_at", { ascending: false }),
    ]);
    if (isMissingSchema(contactsResult.error)) return [];
    if (
      contactsResult.error ||
      (interactionsResult.error && !isMissingSchema(interactionsResult.error))
    )
      throw new Error("Não foi possível carregar Relations.");
    const interactions = (interactionsResult.data ?? []) as InteractionRow[];
    return ((contactsResult.data ?? []) as unknown as ContactRow[]).map((row) => {
      const own = interactions.filter((i) => i.contact_id === row.id);
      const roots = new Set(own.filter((i) => i.direction === "outbound").map((i) => i.id));
      return {
        id: row.id,
        displayName: row.display_name,
        companyId: row.company_id,
        companyName: row.company?.name ?? null,
        ownerDisplayName: row.owner?.display_name ?? "Owner indisponível",
        relationshipRole: row.relationship_role,
        jobTitle: row.job_title,
        email: row.email,
        linkedinUrl: row.linkedin_url,
        phone: row.phone,
        importantContext: row.important_context,
        avatarUrl: row.avatar_url,
        strategicAt: row.strategic_at,
        status: row.status,
        lastContactAt: own[0]?.occurred_at ?? null,
        hasReplied: own.some(
          (i) =>
            i.direction === "inbound" &&
            Boolean(i.reply_to_interaction_id && roots.has(i.reply_to_interaction_id)),
        ),
      };
    });
  }
  async findContact(id: string): Promise<ContactDetail | null> {
    const [contactResult, interactionResult, meetingResult] = await Promise.all([
      this.supabase
        .from("contacts")
        .select(
          `${CONTACT_SELECT},company:companies!contacts_company_id_fkey(name),owner:members!contacts_owner_member_id_fkey(display_name)`,
        )
        .eq("id", id)
        .maybeSingle(),
      this.supabase
        .from("contact_interactions")
        .select(
          "id,contact_id,direction,channel,body,occurred_at,reply_to_interaction_id,recorder:members!contact_interactions_recorded_by_member_id_fkey(display_name)",
        )
        .eq("contact_id", id)
        .order("occurred_at"),
      this.supabase
        .from("meeting_participants")
        .select("meeting:meetings(id,title,starts_at,status)")
        .eq("contact_id", id),
    ]);
    if (contactResult.error) {
      if (isMissingSchema(contactResult.error)) return null;
      throw new Error("Não foi possível carregar o Contact.");
    }
    if (!contactResult.data) return null;
    const row = contactResult.data as unknown as ContactRow;
    const raw = (interactionResult.data ?? []) as unknown as InteractionRow[];
    const interactions: ContactInteractionItem[] = raw.map((i) => ({
      id: i.id,
      direction: i.direction,
      channel: i.channel,
      body: i.body,
      occurredAt: i.occurred_at,
      replyToInteractionId: i.reply_to_interaction_id,
      recorderName: i.recorder?.display_name ?? "Member",
      hasReply: raw.some((r) => r.direction === "inbound" && r.reply_to_interaction_id === i.id),
    }));
    const meetingRows = (meetingResult.data ?? []) as unknown as Array<{
      meeting: { id: string; title: string; starts_at: string; status: string } | null;
    }>;
    const meetings = meetingRows.flatMap((value) =>
      value.meeting
        ? [
            {
              id: value.meeting.id,
              title: value.meeting.title,
              startsAt: value.meeting.starts_at,
              status: value.meeting.status,
            },
          ]
        : [],
    );
    const list = (await this.listContacts()).find((item) => item.id === id)!;
    return {
      ...list,
      companyId: row.company_id,
      ownerMemberId: row.owner_member_id,
      phone: row.phone,
      importantContext: row.important_context,
      interactions,
      meetings,
    };
  }
  async listTemplates(): Promise<MessageTemplateItem[]> {
    const { data, error } = await this.supabase
      .from("contact_message_templates")
      .select("id,name,channel,situation,body,status")
      .order("status")
      .order("updated_at", { ascending: false });
    if (isMissingSchema(error)) return [];
    if (error) throw new Error("Não foi possível carregar as mensagens.");
    return (data ?? []).map((row) => ({
      id: String(row.id),
      name: String(row.name),
      channel: row.channel as ContactChannel,
      situation: String(row.situation),
      body: String(row.body),
      status: row.status as "active" | "archived",
    }));
  }
}
