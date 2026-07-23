"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSprintApplicationErrorMessage } from "@/application/sprints/sprint-service";
import type { SprintClosureDisposition, SprintValues } from "@/domain/sprints/sprint";
import { createSprintModule } from "@/foundation/composition/sprints";
import { withFeedback } from "@/foundation/ui/feedback";

export type SprintFormState = { message: string | null };
function values(form: FormData): SprintValues {
  return {
    name: String(form.get("name") ?? ""),
    intendedResult: String(form.get("intended_result") ?? ""),
    ownerMemberId: String(form.get("owner_member_id") ?? ""),
    startsOn: String(form.get("starts_on") ?? ""),
    endsOn: String(form.get("ends_on") ?? ""),
    materialRisks: String(form.get("material_risks") ?? "") || null,
    taskIds: form.getAll("task_id").map(String),
  };
}
function refresh(id: string) {
  revalidatePath("/sprints");
  revalidatePath(`/sprints/${id}`);
  revalidatePath("/tasks");
}
export async function createSprintAction(
  _: SprintFormState,
  form: FormData,
): Promise<SprintFormState> {
  try {
    const { service } = await createSprintModule();
    const sprint = await service.createSprint(values(form));
    refresh(sprint.id);
    redirect(withFeedback(`/sprints/${sprint.id}`, "Sprint criada."));
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    return { message: getSprintApplicationErrorMessage(error) };
  }
}
async function transition(
  id: string,
  message: string,
  run: (service: Awaited<ReturnType<typeof createSprintModule>>["service"]) => Promise<unknown>,
) {
  const { service } = await createSprintModule();
  await run(service);
  refresh(id);
  redirect(withFeedback(`/sprints/${id}`, message));
}
export async function activateSprintAction(id: string) {
  return transition(id, "Sprint ativada.", (service) => service.activateSprint(id));
}
export async function cancelSprintAction(id: string) {
  return transition(id, "Sprint cancelada.", (service) => service.cancelSprint(id));
}
export async function addSprintTasksAction(id: string, form: FormData) {
  return transition(id, "Tasks adicionadas ao compromisso.", (service) =>
    service.addTasks(id, form.getAll("task_id").map(String)),
  );
}
export async function removeSprintTaskAction(id: string, taskId: string) {
  return transition(id, "Task removida do compromisso planeado.", (service) =>
    service.removeTask(id, taskId),
  );
}
export async function closeSprintAction(
  id: string,
  _: SprintFormState,
  form: FormData,
): Promise<SprintFormState> {
  try {
    const { service } = await createSprintModule();
    const dispositions: Record<string, SprintClosureDisposition> = {};
    for (const [key, value] of form.entries())
      if (key.startsWith("disposition:"))
        dispositions[key.slice("disposition:".length)] = String(value) as SprintClosureDisposition;
    await service.closeSprint(id, {
      actualResult: String(form.get("actual_result") ?? ""),
      learning: String(form.get("learning") ?? ""),
      incompleteDispositions: dispositions,
    });
    refresh(id);
    redirect(withFeedback(`/sprints/${id}`, "Sprint encerrada."));
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    return { message: getSprintApplicationErrorMessage(error) };
  }
}
