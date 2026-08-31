"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAuthenticatedUser } from "@/application/auth/current-user";
import { getGoogleEventArtifactErrorMessage } from "@/application/google/google-event-artifact-service";
import { createGoogleIntegrationModule } from "@/foundation/composition/google";
import { safeWorkspaceReturnTo } from "@/foundation/navigation/return-to";
import { withErrorFeedback, withFeedback } from "@/foundation/ui/feedback";
import { canManageGoogle } from "@/foundation/security/google-access";

export type GoogleEventArtifactFormState = { message: string | null };

export async function saveGoogleEventArtifactAction(
  _previousState: GoogleEventArtifactFormState,
  formData: FormData,
): Promise<GoogleEventArtifactFormState> {
  const user = await getAuthenticatedUser();
  if (!user) return { message: "A sessão terminou. Volta a entrar." };
  if (!canManageGoogle(user.role)) return { message: "Só Admin pode editar eventos Google." };
  const calendarId = String(formData.get("calendar_id") ?? "");
  const eventId = String(formData.get("event_id") ?? "");
  try {
    await (
      await createGoogleIntegrationModule()
    ).eventArtifactService.save(user.id, calendarId, eventId, {
      classification: String(formData.get("classification") ?? ""),
      companyIds: formData.getAll("company_id").map(String),
      notes: String(formData.get("notes") ?? ""),
      output: String(formData.get("output") ?? ""),
      participantMemberIds: formData.getAll("participant_member_id").map(String),
      taskIds: formData.getAll("task_id").map(String),
    });
  } catch (error) {
    return { message: getGoogleEventArtifactErrorMessage(error) };
  }
  revalidatePath("/calendar");
  const returnTo = safeWorkspaceReturnTo(String(formData.get("return_to") ?? ""), "/calendar");
  redirect(withFeedback(detailHref(eventId, calendarId, returnTo), "Contexto guardado."));
}

export async function deleteGoogleEventAction(
  calendarId: string,
  eventId: string,
  returnTo: string,
) {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");
  if (!canManageGoogle(user.role)) redirect(withErrorFeedback(returnTo, "Só Admin pode eliminar eventos Google."));
  try {
    await (
      await createGoogleIntegrationModule()
    ).eventArtifactService.delete(user.id, calendarId, eventId);
  } catch (error) {
    redirect(
      withErrorFeedback(
        detailHref(eventId, calendarId, returnTo),
        getGoogleEventArtifactErrorMessage(error),
      ),
    );
  }
  revalidatePath("/calendar");
  redirect(
    withFeedback(
      safeWorkspaceReturnTo(returnTo, "/calendar"),
      "Evento eliminado do Google e do Vouga OS.",
    ),
  );
}

function detailHref(eventId: string, calendarId: string, returnTo: string) {
  const params = new URLSearchParams({ calendar: calendarId, returnTo });
  return `/calendar/google-event/${encodeURIComponent(eventId)}?${params.toString()}`;
}
