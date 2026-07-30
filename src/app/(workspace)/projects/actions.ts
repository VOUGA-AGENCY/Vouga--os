"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  getProjectApplicationErrorMessage,
  type ProjectFormState,
} from "@/application/projects/project-service";
import type { ProjectOwnedItemValues, ProjectValues } from "@/domain/projects/project";
import { createProjectModule } from "@/foundation/composition/projects";
import { withErrorFeedback, withFeedback } from "@/foundation/ui/feedback";

function money(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "")
    .trim()
    .replace(",", ".");
  const amount = Number(normalized);
  return Number.isFinite(amount) ? Math.round(amount * 100) : Number.NaN;
}

function lines(value: FormDataEntryValue | null): ProjectOwnedItemValues[] {
  return String(value ?? "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((title) => ({ title }));
}

function milestones(form: FormData): ProjectOwnedItemValues[] {
  const ids = form.getAll("milestone_id").map(String);
  const titles = form.getAll("milestone_title").map(String);
  const completed = new Set(form.getAll("milestone_completed").map(String));
  const completedAt = form.getAll("milestone_completed_at").map(String);
  return titles.flatMap((title, index) =>
    title.trim()
      ? [
          {
            id: ids[index] || null,
            title,
            completedAt: completed.has(String(index))
              ? completedAt[index] || new Date().toISOString()
              : null,
          },
        ]
      : [],
  );
}

function resources(form: FormData): ProjectOwnedItemValues[] {
  const ids = form.getAll("resource_id").map(String);
  const titles = form.getAll("resource_title").map(String);
  const kinds = form.getAll("resource_kind").map(String);
  const urls = form.getAll("resource_url").map(String);
  return titles.flatMap((title, index) =>
    title.trim() || urls[index]?.trim()
      ? [
          {
            id: ids[index] || null,
            title,
            kind: kinds[index] || null,
            url: urls[index] ?? "",
          },
        ]
      : [],
  );
}

function values(form: FormData): ProjectValues {
  return {
    name: String(form.get("name") ?? ""),
    clientCompanyId: String(form.get("client_company_id") ?? ""),
    ownerMemberId: String(form.get("owner_member_id") ?? ""),
    startsOn: String(form.get("starts_on") ?? ""),
    targetDeliveryOn: String(form.get("target_delivery_on") ?? ""),
    agreedAmountMinor: money(form.get("agreed_amount")),
    receivedAmountMinor: money(form.get("received_amount") ?? "0"),
    currency: String(form.get("currency") ?? "EUR"),
    objective: String(form.get("objective") ?? ""),
    expectedResult: String(form.get("expected_result") ?? ""),
    nextTaskId: String(form.get("next_task_id") ?? "") || null,
    teamMemberIds: form.getAll("team_member_id").map(String),
    contactIds: form.getAll("contact_id").map(String),
    taskIds: form.getAll("task_id").map(String),
    meetingIds: form.getAll("meeting_id").map(String),
    decisionIds: form.getAll("decision_id").map(String),
    costIds: form.getAll("cost_id").map(String),
    scopeItems: lines(form.get("scope_items")),
    outOfScopeItems: lines(form.get("out_of_scope_items")),
    milestones: milestones(form),
    resources: resources(form),
  };
}

function refresh(id: string) {
  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
  revalidatePath("/tasks");
  revalidatePath("/meetings");
  revalidatePath("/costs");
}

export async function createProjectAction(
  _: ProjectFormState,
  form: FormData,
): Promise<ProjectFormState> {
  try {
    const { service } = await createProjectModule();
    const project = await service.createProject(values(form));
    refresh(project.id);
    redirect(withFeedback(`/projects/${project.id}`, "Project criado."));
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    return { message: getProjectApplicationErrorMessage(error) };
  }
}

export async function updateProjectAction(
  id: string,
  _: ProjectFormState,
  form: FormData,
): Promise<ProjectFormState> {
  try {
    const { service } = await createProjectModule();
    const project = await service.updateProject(id, values(form));
    refresh(project.id);
    redirect(withFeedback(`/projects/${project.id}`, "Alterações guardadas."));
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    return { message: getProjectApplicationErrorMessage(error) };
  }
}

export async function transitionProjectAction(id: string, form: FormData) {
  try {
    const { service } = await createProjectModule();
    await service.transitionProject(
      id,
      String(form.get("next_status") ?? "") as Parameters<typeof service.transitionProject>[1],
      new Date().toISOString(),
    );
    refresh(id);
  } catch (error) {
    redirect(withErrorFeedback(`/projects/${id}`, getProjectApplicationErrorMessage(error)));
  }
  redirect(withFeedback(`/projects/${id}`, "Estado atualizado."));
}
