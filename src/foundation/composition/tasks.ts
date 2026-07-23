import "server-only";
import { TaskService } from "@/application/tasks/task-service";
import { SupabaseMemberDirectory } from "@/persistence/members/supabase-member-directory";
import { SupabaseTaskContextDirectory } from "@/persistence/tasks/supabase-task-context-directory";
import { SupabaseTaskReadModel } from "@/persistence/tasks/supabase-task-read-model";
import { SupabaseTaskRepository } from "@/persistence/tasks/supabase-task-repository";
import { createClient } from "@/persistence/supabase/server";
export async function createTaskModule() {
  const supabase = await createClient();
  const repository = new SupabaseTaskRepository(supabase);
  const contexts = new SupabaseTaskContextDirectory(supabase);
  return {
    service: new TaskService(repository, new SupabaseMemberDirectory(supabase), contexts),
    readModel: new SupabaseTaskReadModel(supabase),
  };
}

export async function loadTaskGoogleEventOptions() {
  const { getAuthenticatedUser } = await import("@/application/auth/current-user");
  const user = await getAuthenticatedUser();
  if (!user) return [];
  const [{ createGoogleIntegrationModule }, { data: mirrors }] = await Promise.all([
    import("./google"),
    (await createClient())
      .from("google_meeting_mirrors")
      .select("calendar_id,google_event_id")
      .eq("member_id", user.id),
  ]);
  const start = new Date();
  const end = new Date(start);
  end.setUTCFullYear(end.getUTCFullYear() + 1);
  const events = await (
    await createGoogleIntegrationModule()
  ).calendarEventService.listVisibleEvents(user.id, {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  });
  const mirrored = new Set(
    (mirrors ?? []).map((item) => `${item.calendar_id}:${item.google_event_id}`),
  );
  return events
    .filter(
      (event) =>
        !mirrored.has(`${event.calendarId}:${event.id}`) &&
        event.end >= start.toISOString() &&
        isTaskOriginCandidate(event),
    )
    .map((event) => ({
      memberId: user.id,
      calendarId: event.calendarId,
      eventId: event.id,
      title: event.title,
      startsAt: event.start,
    }));
}

export function isTaskOriginCandidate(event: {
  allDay: boolean;
  eventType: string | null;
  transparency: string | null;
}) {
  if (event.allDay) return false;
  if (event.transparency === "transparent") return false;
  return event.eventType !== "holiday";
}
