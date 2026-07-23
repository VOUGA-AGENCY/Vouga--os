"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTaskApplicationErrorMessage } from "@/application/tasks/task-service";
import type { TaskValues } from "@/domain/tasks/task";
import { createTaskModule } from "@/foundation/composition/tasks";
import { withFeedback } from "@/foundation/ui/feedback";
import { safeWorkspaceReturnTo } from "@/foundation/navigation/return-to";
export type TaskFormState = { message: string | null };
function values(form: FormData): TaskValues {
  const payload = String(form.get("origin_payload") ?? "planning");
  const [type, ...parts] = payload.split(":");
  const origin =
    type === "meeting"
      ? { type: "meeting" as const, meetingId: parts.join(":") }
      : type === "google"
        ? {
            type: "google_event" as const,
            memberId: decodeURIComponent(parts[0] ?? ""),
            calendarId: decodeURIComponent(parts[1] ?? ""),
            eventId: decodeURIComponent(parts.slice(2).join(":") || ""),
          }
        : type === "legacy-decision"
          ? { type: "decision" as const, decisionId: parts.join(":") }
          : type === "legacy-direct"
            ? { type: "direct" as const, directReason: decodeURIComponent(parts.join(":")) }
            : { type: "planning" as const };
  return {
    title: String(form.get("title") ?? ""),
    ownerMemberId: String(form.get("owner_member_id") ?? ""),
    dueAt: String(form.get("due_at") ?? "") || null,
    origin,
    companyIds: form.getAll("company_id").map(String),
    meetingIds: form.getAll("meeting_id").map(String),
  };
}
function refresh(id: string) {
  revalidatePath("/tasks");
  revalidatePath(`/tasks/${id}`);
  revalidatePath("/companies");
  revalidatePath("/meetings");
  revalidatePath("/decisions");
}
export async function createTaskAction(_: TaskFormState, form: FormData): Promise<TaskFormState> {
  try {
    const taskValues = values(form);
    if (taskValues.origin.type === "google_event") {
      const user = await (await import("@/application/auth/current-user")).getAuthenticatedUser();
      if (!user || user.id !== taskValues.origin.memberId)
        return { message: "O Google Event selecionado não está disponível." };
      const google = await (
        await import("@/foundation/composition/google")
      ).createGoogleIntegrationModule();
      const event = await google.calendarEventService.getVisibleEvent(
        user.id,
        taskValues.origin.calendarId,
        taskValues.origin.eventId,
      );
      if (!event) return { message: "O Google Event selecionado já não está disponível." };
    }
    const { service } = await createTaskModule();
    const task = await service.createTask(taskValues);
    refresh(task.id);
    redirect(
      withFeedback(
        safeWorkspaceReturnTo(String(form.get("return_to") ?? ""), `/tasks/${task.id}`),
        "Task criada.",
      ),
    );
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    return { message: getTaskApplicationErrorMessage(e) };
  }
}
export async function updateTaskAction(
  id: string,
  _: TaskFormState,
  form: FormData,
): Promise<TaskFormState> {
  try {
    const { service } = await createTaskModule();
    const task = await service.updateTask(id, values(form));
    refresh(task.id);
    redirect(withFeedback(`/tasks/${task.id}`, "Alterações guardadas."));
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    return { message: getTaskApplicationErrorMessage(e) };
  }
}
async function transition(
  id: string,
  message: string,
  run: (service: Awaited<ReturnType<typeof createTaskModule>>["service"]) => Promise<unknown>,
) {
  const { service } = await createTaskModule();
  await run(service);
  refresh(id);
  redirect(withFeedback(`/tasks/${id}`, message));
}
export async function startTaskAction(id: string) {
  return transition(id, "Task iniciada.", (s) => s.startTask(id));
}
export async function unblockTaskAction(id: string) {
  return transition(id, "Task desbloqueada.", (s) => s.unblockTask(id));
}
export async function cancelTaskAction(id: string) {
  return transition(id, "Task cancelada.", (s) => s.cancelTask(id));
}
export async function blockTaskAction(id: string, form: FormData) {
  return transition(id, "Task marcada como bloqueada.", (s) =>
    s.blockTask(
      id,
      String(form.get("blocked_reason") ?? ""),
      String(form.get("blocked_next_move") ?? ""),
    ),
  );
}
export async function completeTaskAction(id: string, form: FormData) {
  return transition(id, "Task concluída.", (s) =>
    s.completeTask(id, String(form.get("completion_note") ?? "") || null),
  );
}
export async function deleteTaskAction(id: string) {
  try {
    const { service } = await createTaskModule();
    await service.deleteTask(id);
  } catch (error) {
    redirect(withFeedback(`/tasks/${id}`, getTaskApplicationErrorMessage(error)));
  }
  refresh(id);
  redirect(withFeedback("/tasks", "Task eliminada."));
}
