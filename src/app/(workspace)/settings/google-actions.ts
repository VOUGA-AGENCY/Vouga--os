"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAuthenticatedUser } from "@/application/auth/current-user";
import { createGoogleIntegrationModule } from "@/foundation/composition/google";
import { withErrorFeedback, withFeedback } from "@/foundation/ui/feedback";
import { canManageGoogle } from "@/foundation/security/google-access";

export async function disconnectGoogleAction(): Promise<void> {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");
  if (!canManageGoogle(user.role)) redirect(withErrorFeedback("/settings", "A ligação Google é gerida por Admin."));

  let message: string;
  let failed = false;
  try {
    const result = await (await createGoogleIntegrationModule()).service.disconnect(user.id);
    message = result.remotelyRevoked
      ? "Conta Google desligada."
      : "Conta desligada no OS. Confirma também a revogação na tua Conta Google.";
  } catch {
    message = "Não foi possível desligar a conta Google.";
    failed = true;
  }
  redirect(
    `${failed ? withErrorFeedback("/settings", message) : withFeedback("/settings", message)}#google`,
  );
}

export async function saveGoogleCalendarsAction(formData: FormData): Promise<void> {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");
  if (!canManageGoogle(user.role)) redirect(withErrorFeedback("/settings", "A ligação Google é gerida por Admin."));

  let message: string;
  let failed = false;
  try {
    const calendarIds = formData.getAll("calendar_id").map(String).filter(Boolean);
    const publishCalendarId = String(formData.get("publish_calendar_id") ?? "") || null;
    await (
      await createGoogleIntegrationModule()
    ).calendarService.replaceSelection(user.id, calendarIds, publishCalendarId);
    revalidatePath("/settings");
    message = "Calendários atualizados.";
  } catch {
    message = "Não foi possível guardar os calendários.";
    failed = true;
  }
  redirect(
    `${failed ? withErrorFeedback("/settings", message) : withFeedback("/settings", message)}#google`,
  );
}
