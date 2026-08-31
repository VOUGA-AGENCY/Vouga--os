import "server-only";

import { composeCalendar } from "@/projections/calendar/compose-calendar";
import type { CalendarFilters } from "@/projections/calendar/calendar";
import { getAuthenticatedUser } from "@/application/auth/current-user";
import { canManageGoogle } from "@/foundation/security/google-access";
import { createClient } from "@/persistence/supabase/server";
import { SupabaseGoogleCalendarEventProjectionRepository } from "@/persistence/google/supabase-google-calendar-event-projection-repository";

import { createMeetingModule } from "./meetings";
import { createGoogleIntegrationModule } from "./google";

export async function loadCalendar(
  range: Readonly<{ start: string; end: string }>,
  nowIso: string,
  filters: CalendarFilters,
) {
  const [meetings, user] = await Promise.all([createMeetingModule(), getAuthenticatedUser()]);
  const googleModulePromise = user && canManageGoogle(user.role) ? createGoogleIntegrationModule() : null;
  const sharedGoogleEvents = new SupabaseGoogleCalendarEventProjectionRepository(await createClient());

  return composeCalendar(
    {
      meetings: () => meetings.readModel.list(nowIso),
      tasks: async () => [],
      sprints: async () => [],
      googleEvents: async () => {
        if (!user) return [];
        if (!googleModulePromise) return sharedGoogleEvents.listShared(range);
        try {
          const google = await googleModulePromise;
          // 2.5s timeout guard so Google API latency never freezes the Calendar SSR
          const eventsPromise = google.calendarEventService.listVisibleEvents(user.id, range);
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Google Calendar API timeout")), 2500),
          );
          const events = await Promise.race([eventsPromise, timeoutPromise]);
          await sharedGoogleEvents.replace(user.id, range, events).catch(() => undefined);
          return events;
        } catch {
          return [];
        }
      },
      googleArtifacts: async () => {
        if (!user) return [];
        if (!googleModulePromise) {
          try {
            const google = await createGoogleIntegrationModule();
            return await google.artifactRepository.listShared();
          } catch {
            return [];
          }
        }
        try {
          const google = await googleModulePromise;
          return await google.artifactRepository.list(user.id);
        } catch {
          return [];
        }
      },
    },
    range,
    nowIso,
    filters,
  );
}
