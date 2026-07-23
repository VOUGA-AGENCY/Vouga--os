"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRoadmapApplicationErrorMessage } from "@/application/roadmap/roadmap-service";
import type { RoadmapHorizon, RoadmapItemValues, RoadmapKind } from "@/domain/roadmap/roadmap-item";
import { createRoadmapModule } from "@/foundation/composition/roadmap";
import { withFeedback } from "@/foundation/ui/feedback";

export type RoadmapFormState = { message: string | null };
function values(form: FormData): RoadmapItemValues {
  return {
    title: String(form.get("title") ?? ""),
    kind: String(form.get("kind") ?? "") as RoadmapKind,
    description: String(form.get("description") ?? ""),
    evidence: String(form.get("evidence") ?? ""),
    horizon: String(form.get("horizon") ?? "") as RoadmapHorizon,
    ownerMemberId: String(form.get("owner_member_id") ?? "") || null,
    companyIds: form.getAll("company_id").map(String),
    taskIds: form.getAll("task_id").map(String),
    sprintIds: form.getAll("sprint_id").map(String),
    decisionIds: form.getAll("decision_id").map(String),
  };
}
function refresh(id: string) {
  revalidatePath("/roadmap");
  revalidatePath(`/roadmap/${id}`);
  revalidatePath("/");
}

export async function createRoadmapItemAction(
  _: RoadmapFormState,
  form: FormData,
): Promise<RoadmapFormState> {
  try {
    const { service } = await createRoadmapModule();
    const item = await service.createItem(values(form));
    refresh(item.id);
    redirect(withFeedback(`/roadmap/${item.id}`, "Roadmap Item criado."));
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    return { message: getRoadmapApplicationErrorMessage(error) };
  }
}
export async function updateRoadmapItemAction(
  id: string,
  _: RoadmapFormState,
  form: FormData,
): Promise<RoadmapFormState> {
  try {
    const { service } = await createRoadmapModule();
    const item = await service.updateItem(id, values(form));
    refresh(item.id);
    redirect(withFeedback(`/roadmap/${item.id}`, "Alterações guardadas."));
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    return { message: getRoadmapApplicationErrorMessage(error) };
  }
}
export async function completeRoadmapItemAction(id: string) {
  const { service } = await createRoadmapModule();
  await service.completeItem(id);
  refresh(id);
  redirect(withFeedback("/roadmap", "Roadmap Item concluído."));
}
export async function abandonRoadmapItemAction(id: string) {
  const { service } = await createRoadmapModule();
  await service.abandonItem(id);
  refresh(id);
  redirect(withFeedback("/roadmap", "Roadmap Item abandonado."));
}
