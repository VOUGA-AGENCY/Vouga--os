"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAuthenticatedUser } from "@/application/auth/current-user";
import { createGoogleIntegrationModule } from "@/foundation/composition/google";
import { withFeedback } from "@/foundation/ui/feedback";

export async function disconnectGoogleAction(): Promise<void> {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");

  let message: string;
  try {
    const result = await (await createGoogleIntegrationModule()).service.disconnect(user.id);
    message = result.remotelyRevoked
      ? "Conta Google desligada."
      : "Conta desligada no OS. Confirma também a revogação na tua Conta Google.";
  } catch {
    message = "Não foi possível desligar a conta Google.";
  }
  redirect(`${withFeedback("/settings", message)}#google`);
}

export async function saveGoogleCalendarsAction(formData: FormData): Promise<void> {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");

  let message: string;
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
  }
  redirect(`${withFeedback("/settings", message)}#google`);
}
