"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAuthenticatedUser } from "@/application/auth/current-user";
import {
  getMeetingApplicationErrorMessage,
  type MeetingService,
} from "@/application/meetings/meeting-service";
import { createMeetingModule } from "@/foundation/composition/meetings";
import { safeWorkspaceReturnTo, withReturnTo } from "@/foundation/navigation/return-to";
import { withFeedback } from "@/foundation/ui/feedback";
import type { Meeting } from "@/domain/meetings/meeting";
import { createGoogleIntegrationModule } from "@/foundation/composition/google";

export type MeetingFormState = { message: string | null };

function valuesFromFormData(formData: FormData) {
  return {
    kind: String(formData.get("kind") ?? "meeting"),
    calendarTone: String(formData.get("calendar_tone") ?? ""),
    title: String(formData.get("title") ?? ""),
    startsAt: String(formData.get("starts_at") ?? ""),
    endsAt: String(formData.get("ends_at") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    participantMemberIds: formData.getAll("participant_member_id").map(String),
    companyIds: formData.getAll("company_id").map(String),
    taskIds: formData.getAll("task_id").map(String),
  };
}

async function requireMeetingService(): Promise<{
  service: MeetingService;
  userId: string;
} | null> {
  const user = await getAuthenticatedUser();
  if (!user) return null;
  return { service: (await createMeetingModule()).service, userId: user.id };
}

export async function createMeetingAction(
  _previousState: MeetingFormState,
  formData: FormData,
): Promise<MeetingFormState> {
  const context = await requireMeetingService();
  if (!context) return { message: "A sessão terminou. Volta a entrar." };
  let meeting: Meeting;
  try {
    meeting = await context.service.createMeeting(valuesFromFormData(formData));
  } catch (error) {
    return { message: getMeetingApplicationErrorMessage(error) };
  }
  const mirror = await publishGoogleMirror(context.userId, meeting);
  const returnTo = safeWorkspaceReturnTo(String(formData.get("return_to") ?? ""), "/meetings");
  revalidatePath("/meetings");
  revalidatePath("/calendar");
  redirect(
    withFeedback(
      withReturnTo(`/meetings/${meeting.id}`, returnTo),
      mirrorFeedback(createdLabel(meeting), mirror),
    ),
  );
}

function createdLabel(meeting: Meeting): string {
  if (meeting.kind === "vacation") return "Vacation criada.";
  if (meeting.kind === "event") return "Event criado.";
  return "Meeting criada.";
}

export async function updateMeetingAction(
  meetingId: string,
  _previousState: MeetingFormState,
  formData: FormData,
): Promise<MeetingFormState> {
  const context = await requireMeetingService();
  if (!context) return { message: "A sessão terminou. Volta a entrar." };
  let meeting: Meeting;
  try {
    meeting = await context.service.updateMeeting(meetingId, valuesFromFormData(formData));
  } catch (error) {
    return { message: getMeetingApplicationErrorMessage(error) };
  }
  const mirror = await publishGoogleMirror(context.userId, meeting);
  revalidateMeetingPaths(meetingId);
  redirect(withFeedback(`/meetings/${meetingId}`, mirrorFeedback("Alterações guardadas.", mirror)));
}

export async function closeMeetingAction(
  meetingId: string,
  _previousState: MeetingFormState,
  formData: FormData,
): Promise<MeetingFormState> {
  const context = await requireMeetingService();
  if (!context) return { message: "A sessão terminou. Volta a entrar." };
  try {
    await context.service.closeMeeting(meetingId, String(formData.get("conclusion") ?? ""));
  } catch (error) {
    return { message: getMeetingApplicationErrorMessage(error) };
  }
  revalidateMeetingPaths(meetingId);
  const returnTo = safeWorkspaceReturnTo(
    String(formData.get("return_to") ?? ""),
    `/meetings/${meetingId}`,
  );
  redirect(withFeedback(withReturnTo(`/meetings/${meetingId}`, returnTo), "Output guardado."));
}

export async function cancelMeetingAction(meetingId: string): Promise<void> {
  const context = await requireMeetingService();
  if (!context) redirect("/login");
  const meeting = await context.service.cancelMeeting(meetingId);
  const mirror = await removeGoogleMirror(context.userId, meeting);
  revalidateMeetingPaths(meetingId);
  redirect(withFeedback(`/meetings/${meetingId}`, mirrorFeedback("Meeting cancelada.", mirror)));
}

export async function deleteMeetingAction(meetingId: string): Promise<void> {
  const context = await requireMeetingService();
  if (!context) redirect("/login");
  const meeting = await context.service.getMeeting(meetingId);
  const mirror = await removeGoogleMirror(context.userId, meeting);
  if (mirror === "error")
    redirect(
      withFeedback(
        `/meetings/${meetingId}`,
        "Não foi possível eliminar no Google. Nada foi removido do OS.",
      ),
    );
  try {
    await context.service.deleteMeeting(meetingId);
  } catch (error) {
    redirect(withFeedback(`/meetings/${meetingId}`, getMeetingApplicationErrorMessage(error)));
  }
  revalidateMeetingPaths(meetingId);
  redirect(withFeedback("/calendar", "Meeting ou Event eliminado."));
}

async function publishGoogleMirror(userId: string, meeting: Meeting) {
  try {
    return await (
      await createGoogleIntegrationModule()
    ).meetingMirrorService.publish(userId, meeting);
  } catch {
    return "error" as const;
  }
}

async function removeGoogleMirror(userId: string, meeting: Meeting) {
  try {
    return await (
      await createGoogleIntegrationModule()
    ).meetingMirrorService.remove(userId, meeting);
  } catch {
    return "error" as const;
  }
}

function mirrorFeedback(base: string, result: "synced" | "not-configured" | "error") {
  return result === "error" ? `${base} Google por sincronizar.` : base;
}

function revalidateMeetingPaths(meetingId: string) {
  revalidatePath("/meetings");
  revalidatePath("/calendar");
  revalidatePath(`/meetings/${meetingId}`);
}
