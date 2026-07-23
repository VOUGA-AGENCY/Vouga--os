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

  return composeCalendar(
    {
      meetings: () => meetings.readModel.list(nowIso),
      tasks: async () => [],
      sprints: async () => [],
      googleEvents: async () => {
        if (!user) return [];
        const google = await createGoogleIntegrationModule();
        return google.calendarEventService.listVisibleEvents(user.id, range);
      },
      googleArtifacts: async () => {
        if (!user) return [];
        return (await createGoogleIntegrationModule()).artifactRepository.list(user.id);
      },
    },
    range,
    nowIso,
    filters,
  );
}
