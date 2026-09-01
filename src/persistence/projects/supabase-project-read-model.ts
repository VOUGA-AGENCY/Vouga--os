import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { CostCategory, CostRecurrence, CostStatus, CostType } from "@/domain/costs/cost";
import type { DecisionStatus } from "@/domain/decisions/decision";
import type { MeetingKind, MeetingStatus } from "@/domain/meetings/meeting";
import type { ProjectScopeKind, ProjectStatus } from "@/domain/projects/project";
import type { TaskStatus } from "@/domain/tasks/task";
import type { CostListItem } from "@/projections/costs/cost-read-model";
import type {
  ProjectDecisionItem,
  ProjectDetail,
  ProjectListItem,
  ProjectMeetingItem,
  ProjectReadModel,
  ProjectStatusChange,
  ProjectTaskItem,
} from "@/projections/projects/project-read-model";

type TaskRow = {
  id: string;
  title: string;
  status: TaskStatus;
  due_at: string | null;
  completed_at: string | null;
  owner: { display_name: string } | null;
};

type CostRow = {
  id: string;
  title: string;
  description: string;
  category: CostCategory;
  supplier: string | null;
  expected_amount_minor: number;
  actual_amount_minor: number | null;
  currency: string;
  cost_type: CostType;
  recurrence: CostRecurrence | null;
  expected_on: string | null;
  starts_on: string | null;
  billing_anchor_on: string | null;
  paid_on: string | null;
  ended_on: string | null;
  cancelled_on: string | null;
  status: CostStatus;
  owner_member_id: string | null;
  created_at: string;
  updated_at: string;
  owner: { display_name: string } | null;
  company: { name: string } | null;
  roadmap_item: { title: string } | null;
  source_decision: { title: string } | null;
  cost_tasks: Array<{ task_id: string }>;
};

type ListRow = {
  id: string;
  name: string;
  status: ProjectStatus;
  starts_on: string;
  target_delivery_on: string;
  agreed_amount_minor: number;
  received_amount_minor: number;
  currency: string;
  updated_at: string;
  client: { id: string; name: string } | null;
  owner: { id: string; display_name: string } | null;
  next_task: TaskRow | null;
};

type DetailRow = ListRow & {
  objective: string;
  expected_result: string;
  created_at: string;
  project_members: Array<{
    member_id: string;
    member: { display_name: string; email: string } | null;
  }>;
  project_contacts: Array<{
    contact_id: string;
    contact: {
      display_name: string;
      job_title: string | null;
      avatar_url: string | null;
    } | null;
  }>;
  project_tasks: Array<{ task_id: string; task: TaskRow | null }>;
  project_meetings: Array<{
    meeting_id: string;
    meeting: {
      title: string;
      kind: MeetingKind;
      status: MeetingStatus;
      starts_at: string;
      ends_at: string;
    } | null;
  }>;
  project_decisions: Array<{
    decision_id: string;
    decision: {
      title: string;
      status: DecisionStatus;
      decided_on: string;
    } | null;
  }>;
  project_costs: Array<{ cost_id: string; cost: CostRow | null }>;
  project_scope_items: Array<{
    id: string;
    kind: ProjectScopeKind;
    label: string;
    position: number;
  }>;
  project_milestones: Array<{
    id: string;
    title: string;
    position: number;
    completed_at: string | null;
  }>;
  project_resources: Array<{
    id: string;
    title: string;
    kind: string | null;
    url: string;
    position: number;
  }>;
  project_status_changes: Array<{
    id: string;
    from_status: ProjectStatus | null;
    to_status: ProjectStatus;
    changed_at: string;
    changed_by: { display_name: string } | null;
  }>;
};

const TASK_SELECT =
  "id,title,status,due_at,completed_at,owner:members!tasks_owner_member_id_fkey(display_name)";
const LIST_SELECT = `id,name,status,starts_on,target_delivery_on,agreed_amount_minor,received_amount_minor,currency,updated_at,client:companies!projects_client_company_id_fkey(id,name),owner:members!projects_owner_member_id_fkey(id,display_name),next_task:tasks!projects_next_task_id_fkey(${TASK_SELECT})`;
const COST_SELECT =
  "id,title,description,category,supplier,expected_amount_minor,actual_amount_minor,currency,cost_type,recurrence,expected_on,starts_on,billing_anchor_on,paid_on,ended_on,cancelled_on,status,owner_member_id,created_at,updated_at,owner:members!costs_owner_member_id_fkey(display_name),company:companies!costs_company_id_fkey(name),roadmap_item:roadmap_items!costs_roadmap_item_id_fkey(title),source_decision:decisions!costs_source_decision_id_fkey(title),cost_tasks(task_id)";
const DETAIL_SELECT = `${LIST_SELECT},objective,expected_result,created_at,project_members(member_id,member:members!project_members_member_id_fkey(display_name,email)),project_contacts(contact_id,contact:contacts!project_contacts_contact_id_fkey(display_name,job_title,avatar_url)),project_tasks(task_id,task:tasks!project_tasks_task_id_fkey(${TASK_SELECT})),project_meetings(meeting_id,meeting:meetings!project_meetings_meeting_id_fkey(title,kind,status,starts_at,ends_at)),project_decisions(decision_id,decision:decisions!project_decisions_decision_id_fkey(title,status,decided_on)),project_costs(cost_id,cost:costs!project_costs_cost_id_fkey(${COST_SELECT})),project_scope_items(id,kind,label,position),project_milestones(id,title,position,completed_at),project_resources(id,title,kind,url,position),project_status_changes(id,from_status,to_status,changed_at,changed_by:members!project_status_changes_changed_by_member_id_fkey(display_name))`;

export class SupabaseProjectReadModel implements ProjectReadModel {
  constructor(private readonly supabase: SupabaseClient) {}

  async list() {
    const { data, error } = await this.supabase
      .from("projects")
      .select(LIST_SELECT)
      .order("target_delivery_on", { ascending: true });
    if (error) throw new Error("Não foi possível carregar Projects.");
    return ((data ?? []) as unknown as ListRow[]).map(list);
  }

  async findById(id: string) {
    const { data, error } = await this.supabase
      .from("projects")
      .select(DETAIL_SELECT)
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error("Não foi possível carregar o Project.");
    return data ? detail(data as unknown as DetailRow) : null;
  }

  async listByCompany(companyId: string) {
    const { data, error } = await this.supabase
      .from("projects")
      .select(LIST_SELECT)
      .eq("client_company_id", companyId)
      .order("target_delivery_on", { ascending: true });
    if (error) throw new Error("Não foi possível carregar Projects da Organização.");
    return ((data ?? []) as unknown as ListRow[]).map(list);
  }
}

function task(row: TaskRow): ProjectTaskItem {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    ownerDisplayName: row.owner?.display_name ?? "Owner indisponível",
    dueAt: row.due_at,
    completedAt: row.completed_at,
  };
}

function list(row: ListRow): ProjectListItem {
  if (!row.client || !row.owner) {
    throw new Error("O Project perdeu uma relação obrigatória.");
  }
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    client: { id: row.client.id, name: row.client.name },
    owner: { id: row.owner.id, displayName: row.owner.display_name },
    startsOn: row.starts_on,
    targetDeliveryOn: row.target_delivery_on,
    agreedAmountMinor: row.agreed_amount_minor,
    receivedAmountMinor: row.received_amount_minor,
    currency: row.currency,
    nextTask: row.next_task ? task(row.next_task) : null,
    updatedAt: row.updated_at,
  };
}

function detail(row: DetailRow): ProjectDetail {
  const tasks = row.project_tasks.flatMap((entry) => (entry.task ? [task(entry.task)] : []));
  const meetings: ProjectMeetingItem[] = row.project_meetings.flatMap((entry) =>
    entry.meeting
      ? [
          {
            id: entry.meeting_id,
            title: entry.meeting.title,
            kind: entry.meeting.kind,
            status: entry.meeting.status,
            startsAt: entry.meeting.starts_at,
            endsAt: entry.meeting.ends_at,
          },
        ]
      : [],
  );
  const decisions: ProjectDecisionItem[] = row.project_decisions.flatMap((entry) =>
    entry.decision
      ? [
          {
            id: entry.decision_id,
            title: entry.decision.title,
            status: entry.decision.status,
            decidedOn: entry.decision.decided_on,
          },
        ]
      : [],
  );
  const statusChanges: ProjectStatusChange[] = row.project_status_changes
    .map((entry) => ({
      id: entry.id,
      fromStatus: entry.from_status,
      toStatus: entry.to_status,
      changedByDisplayName: entry.changed_by?.display_name ?? "Member indisponível",
      changedAt: entry.changed_at,
    }))
    .sort((left, right) => right.changedAt.localeCompare(left.changedAt));

  return {
    ...list(row),
    objective: row.objective,
    expectedResult: row.expected_result,
    team: row.project_members.flatMap((entry) =>
      entry.member
        ? [
            {
              id: entry.member_id,
              displayName: entry.member.display_name,
              meta: entry.member.email,
            },
          ]
        : [],
    ),
    contacts: row.project_contacts.flatMap((entry) =>
      entry.contact
        ? [
            {
              id: entry.contact_id,
              displayName: entry.contact.display_name,
              meta: entry.contact.job_title,
              avatarUrl: entry.contact.avatar_url,
            },
          ]
        : [],
    ),
    tasks,
    meetings: meetings.sort((left, right) => left.startsAt.localeCompare(right.startsAt)),
    decisions: decisions.sort((left, right) => right.decidedOn.localeCompare(left.decidedOn)),
    costs: row.project_costs.flatMap((entry) => (entry.cost ? [cost(entry.cost)] : [])),
    scopeItems: row.project_scope_items
      .map((entry) => ({
        id: entry.id,
        kind: entry.kind,
        label: entry.label,
        position: entry.position,
      }))
      .sort((left, right) => left.position - right.position),
    milestones: row.project_milestones
      .map((entry) => ({
        id: entry.id,
        title: entry.title,
        position: entry.position,
        completedAt: entry.completed_at,
      }))
      .sort((left, right) => left.position - right.position),
    resources: row.project_resources
      .map((entry) => ({
        id: entry.id,
        title: entry.title,
        kind: entry.kind,
        url: entry.url,
        position: entry.position,
      }))
      .sort((left, right) => left.position - right.position),
    statusChanges,
    createdAt: row.created_at,
  };
}

function cost(row: CostRow): CostListItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    supplier: row.supplier,
    expectedAmountMinor: row.expected_amount_minor,
    actualAmountMinor: row.actual_amount_minor,
    currency: row.currency,
    costType: row.cost_type,
    recurrence: row.recurrence,
    expectedOn: row.expected_on,
    startsOn: row.starts_on,
    billingAnchorOn: row.billing_anchor_on,
    paidOn: row.paid_on,
    endedOn: row.ended_on,
    cancelledOn: row.cancelled_on,
    status: row.status,
    ownerMemberId: row.owner_member_id,
    ownerDisplayName: row.owner?.display_name ?? null,
    companyName: row.company?.name ?? null,
    roadmapItemTitle: row.roadmap_item?.title ?? null,
    sourceDecisionTitle: row.source_decision?.title ?? null,
    taskCount: row.cost_tasks.length,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
