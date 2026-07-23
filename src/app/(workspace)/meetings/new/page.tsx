import { getAuthenticatedUser } from "@/application/auth/current-user";
import { createMeetingModule } from "@/foundation/composition/meetings";
import { isDateKey, lisbonLocalTimeToIso } from "@/projections/calendar/calendar-time";
import { safeWorkspaceReturnTo } from "@/foundation/navigation/return-to";

import { createMeetingAction } from "../actions";
import { MeetingForm } from "../meeting-form";

type NewMeetingSearchParams = {
  date?: string;
  endsAt?: string;
  returnTo?: string;
  startsAt?: string;
};

export default async function NewMeetingPage({
  searchParams,
}: {
  searchParams: Promise<NewMeetingSearchParams>;
}) {
  const [params, { service }, user] = await Promise.all([
    searchParams,
    createMeetingModule(),
    getAuthenticatedUser(),
  ]);
  const options = await service.getFormOptions();
  const selectedDate = params.date && isDateKey(params.date) ? params.date : null;
  const requestedStart = validInstant(params.startsAt);
  const requestedEnd = validInstant(params.endsAt);
  const startsAt =
    requestedStart ?? (selectedDate ? lisbonMorningOn(selectedDate) : nextWholeHour());
  const endsAt =
    requestedEnd && Date.parse(requestedEnd) > Date.parse(startsAt)
      ? requestedEnd
      : new Date(Date.parse(startsAt) + 60 * 60 * 1000).toISOString();
  const returnTo = safeWorkspaceReturnTo(params.returnTo, "/meetings");

  return (
    <main className="workspace-main module-main module-form-main object-form-page object-form-meeting">
      <p className="eyebrow">Calendar</p>
      <h1 className="display">New</h1>
      <MeetingForm
        action={createMeetingAction}
        defaults={{ startsAt, endsAt, participantMemberId: user?.id }}
        options={options}
        returnTo={returnTo}
      />
    </main>
  );
}

function nextWholeHour(): string {
  const date = new Date();
  date.setUTCMinutes(0, 0, 0);
  date.setUTCHours(date.getUTCHours() + 1);
  return date.toISOString();
}

function lisbonMorningOn(dateKey: string): string {
  return lisbonLocalTimeToIso(dateKey, 9, 0);
}

function validInstant(value: string | undefined): string | null {
  if (!value || Number.isNaN(Date.parse(value))) return null;
  return new Date(value).toISOString();
}
