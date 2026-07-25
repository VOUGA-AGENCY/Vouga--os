import "server-only";

import { composeCalendar } from "@/projections/calendar/compose-calendar";
import type { CalendarFilters } from "@/projections/calendar/calendar";
import { getAuthenticatedUser } from "@/application/auth/current-user";

import { createMeetingModule } from "./meetings";
import { createGoogleIntegrationModule } from "./google";

export async function loadCalendar(
  range: Readonly<{ start: string; end: string }>,
  nowIso: string,
  filters: CalendarFilters,
) {
  const [meetings, user] = await Promise.all([createMeetingModule(), getAuthenticatedUser()]);
  const googleModulePromise = user ? createGoogleIntegrationModule() : null;

  return composeCalendar(
    {
      meetings: () => meetings.readModel.list(nowIso),
      tasks: async () => [],
      sprints: async () => [],
      googleEvents: async () => {
        if (!user || !googleModulePromise) return [];
        try {
          const google = await googleModulePromise;
          // 2.5s timeout guard so Google API latency never freezes the Calendar SSR
          const eventsPromise = google.calendarEventService.listVisibleEvents(user.id, range);
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Google Calendar API timeout")), 2500),
          );
          return await Promise.race([eventsPromise, timeoutPromise]);
        } catch {
          return [];
        }
      },
      googleArtifacts: async () => {
        if (!user || !googleModulePromise) return [];
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
