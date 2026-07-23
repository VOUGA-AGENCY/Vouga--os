import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";

import { MEETING_STATUS_LABELS, type MeetingStatus } from "@/domain/meetings/meeting";
import { createMeetingModule } from "@/foundation/composition/meetings";
import {
  addMonths,
  dateKeyInLisbon,
  enumerateDays,
  isDateKey,
  rangeForView,
} from "@/projections/calendar/calendar-time";
import type { MeetingListItem } from "@/projections/meetings/meeting-read-model";

type MeetingsSearchParams = {
  date?: string;
};

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"] as const;

export default async function MeetingsPage({
  searchParams,
}: {
  searchParams: Promise<MeetingsSearchParams>;
}) {
  const params = await searchParams;
  const nowIso = new Date().toISOString();
  const today = dateKeyInLisbon(nowIso);
  const selectedDate = params.date && isDateKey(params.date) ? params.date : today;
  const { readModel } = await createMeetingModule();
  const meetings = await readModel.list(nowIso);
  const meetingsByDate = groupMeetingsByDate(meetings);
  const needsClosure = meetings.filter((meeting) => meeting.status === "needs_closure");
  const selectedMeetings = meetingsByDate.get(selectedDate) ?? [];
  const monthRange = rangeForView("month", selectedDate);
  const calendarDays = enumerateDays(monthRange.start, monthRange.end);

  return (
    <main className="workspace-main module-main meetings-main">
      <div className="module-heading meetings-heading">
        <div>
          <h1 className="display">Meetings</h1>
          <p className="workspace-intro">Conversas com resultado.</p>
        </div>
      </div>

      <div className="meetings-dashboard-top">
        <section className="meeting-create-panel">
          <div>
            <p className="eyebrow">Meetings</p>
            <h2 className="section-title">New meeting</h2>
            <p>{formatSelectedDate(selectedDate)}</p>
          </div>
          <Link className="button-primary" href={`/meetings/new?date=${selectedDate}`}>
            <Plus aria-hidden="true" size={16} strokeWidth={1.8} />
            New meeting
          </Link>
        </section>

        <MiniMeetingCalendar
          days={calendarDays}
          meetingsByDate={meetingsByDate}
          selectedDate={selectedDate}
          today={today}
        />
      </div>

      <div className="meetings-dashboard-lists">
        <MeetingSection
          emptyMessage="Não existem Meetings sem output."
          eyebrow="Output"
          meetings={needsClosure}
          showDate
          title="Meetings sem output"
          tone="attention"
        />
        <MeetingSection
          createHref={`/meetings/new?date=${selectedDate}`}
          emptyMessage="Não existem Meetings neste dia."
          eyebrow={selectedDate === today ? "Hoje" : "Dia selecionado"}
          meetings={selectedMeetings}
          title={formatSelectedDate(selectedDate)}
          tone="day"
        />
      </div>
    </main>
  );
}

function MiniMeetingCalendar({
  days,
  meetingsByDate,
  selectedDate,
  today,
}: {
  days: readonly string[];
  meetingsByDate: ReadonlyMap<string, readonly MeetingListItem[]>;
  selectedDate: string;
  today: string;
}) {
  const currentMonth = selectedDate.slice(0, 7);
  const previousMonth = addMonths(selectedDate, -1);
  const nextMonth = addMonths(selectedDate, 1);

  return (
    <section aria-label="Calendário mensal de Meetings" className="meeting-mini-calendar">
      <div className="meeting-mini-calendar-heading">
        <div>
          <p className="eyebrow">Agenda</p>
          <h2 className="section-title">{formatMonthTitle(selectedDate)}</h2>
        </div>
        <div aria-label="Navegar entre meses" className="meeting-mini-calendar-navigation">
          <Link
            aria-label={`Mês anterior, ${formatMonthTitle(previousMonth)}`}
            className="icon-button"
            href={`/meetings?date=${previousMonth}`}
          >
            <ChevronLeft aria-hidden="true" size={16} strokeWidth={1.8} />
          </Link>
          <Link
            aria-label={`Mês seguinte, ${formatMonthTitle(nextMonth)}`}
            className="icon-button"
            href={`/meetings?date=${nextMonth}`}
          >
            <ChevronRight aria-hidden="true" size={16} strokeWidth={1.8} />
          </Link>
        </div>
      </div>

      <div aria-hidden="true" className="meeting-mini-calendar-weekdays">
        {WEEKDAYS.map((weekday) => (
          <span key={weekday}>{weekday}</span>
        ))}
      </div>
      <div className="meeting-mini-calendar-grid">
        {days.map((day) => {
          const dayMeetings = meetingsByDate.get(day) ?? [];
          const tone = calendarDayTone(dayMeetings);
          const isSelected = day === selectedDate;
          const isToday = day === today;
          const isOutside = day.slice(0, 7) !== currentMonth;
          const countLabel = `${dayMeetings.length} ${dayMeetings.length === 1 ? "Meeting" : "Meetings"}`;

          return (
            <Link
              aria-current={isSelected ? "page" : undefined}
              aria-label={`${formatAccessibleDate(day)}: ${countLabel}${isSelected ? ", selecionado" : ""}`}
              className={[
                "meeting-mini-calendar-day",
                dayMeetings.length > 0 ? "meeting-mini-calendar-day-has-meetings" : "",
                tone ? `meeting-mini-calendar-day-${tone}` : "",
                isSelected ? "meeting-mini-calendar-day-selected" : "",
                isToday ? "meeting-mini-calendar-day-today" : "",
                isOutside ? "meeting-mini-calendar-day-outside" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              href={`/meetings?date=${day}`}
              key={day}
            >
              <time dateTime={day}>{Number(day.slice(8, 10))}</time>
              {dayMeetings.length > 0 && (
                <span aria-hidden="true" className="meeting-mini-calendar-ring" />
              )}
              <span className="sr-only">{countLabel}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function MeetingSection({
  createHref,
  emptyMessage,
  eyebrow,
  meetings,
  showDate = false,
  title,
  tone,
}: {
  createHref?: string;
  emptyMessage: string;
  eyebrow: string;
  meetings: readonly MeetingListItem[];
  showDate?: boolean;
  title: string;
  tone: "attention" | "day";
}) {
  return (
    <section className={`meeting-day-panel meeting-day-panel-${tone}`}>
      <div className="meeting-day-panel-heading">
        <div>
          <p className="eyebrow">
            {eyebrow} · {meetings.length}
          </p>
          <h2 className="section-title">{title}</h2>
        </div>
        {createHref && (
          <Link className="button-secondary button-compact" href={createHref}>
            <Plus aria-hidden="true" size={14} strokeWidth={1.8} />
            Nova
          </Link>
        )}
      </div>

      {meetings.length === 0 ? (
        <p className="meeting-day-panel-empty">{emptyMessage}</p>
      ) : (
        <div className="meeting-compact-list">
          {meetings.map((meeting) => (
            <MeetingRow key={meeting.id} meeting={meeting} showDate={showDate} />
          ))}
        </div>
      )}
    </section>
  );
}

function MeetingRow({ meeting, showDate }: { meeting: MeetingListItem; showDate: boolean }) {
  return (
    <Link className="meeting-compact-row" href={`/meetings/${meeting.id}`}>
      <div className="meeting-compact-time">
        {showDate && <time dateTime={meeting.startsAt}>{formatMeetingDay(meeting.startsAt)}</time>}
        <span>{formatMeetingInterval(meeting.startsAt, meeting.endsAt)}</span>
      </div>
      <div className="meeting-compact-primary">
        <h3>{meeting.title}</h3>
        <p>
          {meeting.companyNames.length > 0
            ? meeting.companyNames.join(" · ")
            : meeting.kind === "vacation"
              ? "Vacation"
              : meeting.kind === "event"
                ? "Event"
                : "Meeting"}
        </p>
      </div>
      <span className={`status-pill status-pill-${meeting.status}`}>
        {MEETING_STATUS_LABELS[meeting.status]}
      </span>
    </Link>
  );
}

function groupMeetingsByDate(
  meetings: readonly MeetingListItem[],
): ReadonlyMap<string, readonly MeetingListItem[]> {
  const grouped = new Map<string, MeetingListItem[]>();
  for (const meeting of meetings) {
    const date = dateKeyInLisbon(meeting.startsAt);
    grouped.set(date, [...(grouped.get(date) ?? []), meeting]);
  }
  return grouped;
}

function calendarDayTone(meetings: readonly MeetingListItem[]): MeetingStatus | null {
  if (meetings.some((meeting) => meeting.status === "needs_closure")) return "needs_closure";
  if (meetings.some((meeting) => meeting.status === "planned")) return "planned";
  if (meetings.some((meeting) => meeting.status === "closed")) return "closed";
  if (meetings.some((meeting) => meeting.status === "cancelled")) return "cancelled";
  return null;
}

function formatMonthTitle(value: string): string {
  return new Intl.DateTimeFormat("pt-PT", {
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00.000Z`));
}

function formatSelectedDate(value: string): string {
  return new Intl.DateTimeFormat("pt-PT", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    weekday: "long",
  }).format(new Date(`${value}T12:00:00.000Z`));
}

function formatAccessibleDate(value: string): string {
  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "full",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00.000Z`));
}

function formatMeetingDay(value: string): string {
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "short",
    timeZone: "Europe/Lisbon",
  }).format(new Date(value));
}

function formatMeetingInterval(startsAt: string, endsAt: string): string {
  const formatter = new Intl.DateTimeFormat("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Lisbon",
  });
  return `${formatter.format(new Date(startsAt))}–${formatter.format(new Date(endsAt))}`;
}
