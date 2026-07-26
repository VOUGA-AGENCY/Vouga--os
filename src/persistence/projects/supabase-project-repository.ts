import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { ProjectRepository } from "@/application/projects/contracts";
import type {
  Project,
  ProjectScopeKind,
  ProjectStatus,
  ValidProjectValues,
} from "@/domain/projects/project";

type Row = {
  id: string;
  name: string;
  client_company_id: string;
  owner_member_id: string;
  status: ProjectStatus;
  starts_on: string;
  target_delivery_on: string;
  agreed_amount_minor: number;
  received_amount_minor: number;
  currency: string;
  objective: string;
  expected_result: string;
  next_task_id: string | null;
  created_at: string;
  updated_at: string;
  project_members: Array<{ member_id: string }>;
  project_contacts: Array<{ contact_id: string }>;
  project_tasks: Array<{ task_id: string }>;
  project_meetings: Array<{ meeting_id: string }>;
  project_decisions: Array<{ decision_id: string }>;
  project_costs: Array<{ cost_id: string }>;
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
};

const SELECT =
  "id,name,client_company_id,owner_member_id,status,starts_on,target_delivery_on,agreed_amount_minor,received_amount_minor,currency,objective,expected_result,next_task_id,created_at,updated_at,project_members(member_id),project_contacts(contact_id),project_tasks(task_id),project_meetings(meeting_id),project_decisions(decision_id),project_costs(cost_id),project_scope_items(id,kind,label,position),project_milestones(id,title,position,completed_at),project_resources(id,title,kind,url,position)";

export class SupabaseProjectRepository implements ProjectRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findById(id: string) {
    const { data, error } = await this.supabase
      .from("projects")
      .select(SELECT)
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error("Não foi possível carregar o Project.");
    return data ? map(data as unknown as Row) : null;
  }

  async create(values: ValidProjectValues) {
    const { data, error } = await this.supabase.rpc("create_project", args(values));
    if (error || typeof data !== "string") {
      throw new Error("Não foi possível criar o Project.");
    }
    return this.require(data);
  }

  async update(project: Project, values: ValidProjectValues) {
    const { error } = await this.supabase.rpc("update_project", {
      p_project_id: project.id,
      ...args(values),
    });
    if (error) throw new Error("Não foi possível atualizar o Project.");
    return this.require(project.id);
  }

  async transition(project: Project, status: ProjectStatus) {
    const { error } = await this.supabase.rpc("transition_project", {
      p_project_id: project.id,
      p_next_status: status,
    });
    if (error) throw new Error("Não foi possível atualizar o estado do Project.");
    return this.require(project.id);
  }

  private async require(id: string) {
    const project = await this.findById(id);
    if (!project) throw new Error("O Project não existe.");
    return project;
  }
}

function args(values: ValidProjectValues) {
  return {
    p_values: {
      name: values.name,
      client_company_id: values.clientCompanyId,
      owner_member_id: values.ownerMemberId,
      starts_on: values.startsOn,
      target_delivery_on: values.targetDeliveryOn,
      agreed_amount_minor: values.agreedAmountMinor,
      received_amount_minor: values.receivedAmountMinor,
      currency: values.currency,
      objective: values.objective,
      expected_result: values.expectedResult,
      next_task_id: values.nextTaskId,
    },
    p_member_ids: values.teamMemberIds,
    p_contact_ids: values.contactIds,
    p_task_ids: values.taskIds,
    p_meeting_ids: values.meetingIds,
    p_decision_ids: values.decisionIds,
    p_cost_ids: values.costIds,
    p_scope_items: values.scopeItems,
    p_out_of_scope_items: values.outOfScopeItems,
    p_milestones: values.milestones.map((item) => ({
      id: item.id,
      title: item.title,
      completed_at: item.completedAt,
    })),
    p_resources: values.resources,
  };
}

function map(row: Row): Project {
  return {
    id: row.id,
    name: row.name,
    clientCompanyId: row.client_company_id,
    ownerMemberId: row.owner_member_id,
    status: row.status,
    startsOn: row.starts_on,
    targetDeliveryOn: row.target_delivery_on,
    agreedAmountMinor: row.agreed_amount_minor,
    receivedAmountMinor: row.received_amount_minor,
    currency: row.currency,
    objective: row.objective,
    expectedResult: row.expected_result,
    nextTaskId: row.next_task_id,
    teamMemberIds: row.project_members.map((item) => item.member_id),
    contactIds: row.project_contacts.map((item) => item.contact_id),
    taskIds: row.project_tasks.map((item) => item.task_id),
    meetingIds: row.project_meetings.map((item) => item.meeting_id),
    decisionIds: row.project_decisions.map((item) => item.decision_id),
    costIds: row.project_costs.map((item) => item.cost_id),
    scopeItems: row.project_scope_items
      .map((item) => ({
        id: item.id,
        kind: item.kind,
        label: item.label,
        position: item.position,
      }))
      .sort((left, right) => left.position - right.position),
    milestones: row.project_milestones
      .map((item) => ({
        id: item.id,
        title: item.title,
        position: item.position,
        completedAt: item.completed_at,
      }))
      .sort((left, right) => left.position - right.position),
    resources: row.project_resources
      .map((item) => ({
        id: item.id,
        title: item.title,
        kind: item.kind,
        url: item.url,
        position: item.position,
      }))
      .sort((left, right) => left.position - right.position),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
