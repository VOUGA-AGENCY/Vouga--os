"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type {
  CalendarEntry,
  CalendarMeetingSummary,
  CalendarProjection,
  CalendarSourceType,
} from "@/projections/calendar/calendar";
import {
  entryOccursOn,
  enumerateDays,
  moveAnchor,
  type CalendarView,
} from "@/projections/calendar/calendar-time";
import { withReturnTo } from "@/foundation/navigation/return-to";

import { CalendarWeekGrid } from "./calendar-week-grid";

const SOURCE_LABELS: Record<CalendarSourceType, string> = {
  meeting: "Meetings",
  task: "Tasks",
  milestone: "Milestones",
  google: "Google",
};
const BASIS_LABELS: Record<CalendarEntry["temporalBasis"], string> = {
  scheduled: "Agendado",
  expected: "Esperado",
  confirmed: "Confirmado",
  derived: "Recorrência derivada",
  historical: "Histórico",
};
const VIEW_LABELS: Record<CalendarView, string> = {
  week: "Semana",
  month: "Mês",
  agenda: "Agenda",
};
const AVAILABLE_VIEWS: CalendarView[] = ["week", "month"];

type Filters = { history: boolean; owner: string; sourceType: string };

export function CalendarSurface({
  anchor,
  filters,
  projection,
  selectedDate,
  today,
  view,
}: {
  anchor: string;
  filters: Filters;
  projection: CalendarProjection;
  selectedDate: string;
  today: string;
  view: CalendarView;
}) {
  const days = enumerateDays(projection.range.start, projection.range.end);
  const failedSources = Object.entries(projection.sourceStates)
    .filter(([, status]) => status === "error")
    .map(([source]) => SOURCE_LABELS[source as CalendarSourceType]);
  const allSourcesFailed = failedSources.length === Object.keys(projection.sourceStates).length;
  const returnTo = calendarHref(view, anchor, filters, selectedDate);
  const previousAnchor = moveAnchor(view, anchor, -1);
  const nextAnchor = moveAnchor(view, anchor, 1);
  const previousHref = calendarHref(view, previousAnchor, filters, previousAnchor);
  const nextHref = calendarHref(view, nextAnchor, filters, nextAnchor);

  return (
    <main className="workspace-main module-main calendar-main">
      <div className="module-heading calendar-heading">
        <div>
          <h1 className="display">Calendar</h1>
          <p className="workspace-intro">A tua semana.</p>
        </div>
      </div>

      <section className="calendar-controls" aria-label="Controlos do Calendar">
        <div className="calendar-desktop-period-controls">
          <strong>{formatMonthYear(anchor)}</strong>
        </div>

        <nav aria-label="Vistas do Calendar" className="calendar-view-tabs">
          {AVAILABLE_VIEWS.map((candidate) => (
            <Link
              aria-current={candidate === view ? "page" : undefined}
              className={candidate === view ? "active" : ""}
              href={calendarHref(candidate, selectedDate, filters, selectedDate)}
              key={candidate}
            >
              {VIEW_LABELS[candidate]}
            </Link>
          ))}
        </nav>

        <Link className="button-secondary calendar-toolbar-new" href="/meetings/new">
          New
        </Link>
      </section>

      {projection.isPartial && !allSourcesFailed ? (
        <div className="calendar-source-warning" role="status">
          <strong>Leitura parcial.</strong>
          <span>
            {failedSources.join(" e ")}{" "}
            {failedSources.length === 1 ? "está indisponível" : "estão indisponíveis"}.
          </span>
        </div>
      ) : null}
      {projection.overflow ? (
        <div className="calendar-source-warning" role="status">
          <strong>Janela com demasiados compromissos.</strong>
          <span>Refina os filtros ou avança para um período mais curto.</span>
        </div>
      ) : null}

      <section aria-label="Calendar filtrado" className="calendar-board">
        {allSourcesFailed ? (
          <section className="empty-state empty-state-inline" role="alert">
            <h2 className="display">Calendar unavailable.</h2>
            <p>Try again. No empty state is being assumed.</p>
          </section>
        ) : (
          <>
            {view === "week" ? (
              <>
                <div className="calendar-desktop-surface">
                  <CalendarWeekGrid
                    days={days}
                    entries={projection.entries}
                    nextHref={nextHref}
                    previousHref={previousHref}
                    returnTo={returnTo}
                    today={today}
                  />
                </div>
                <MobileWeekView
                  anchor={anchor}
                  days={days}
                  entries={projection.entries}
                  filters={filters}
                  nextHref={nextHref}
                  previousHref={previousHref}
                  returnTo={returnTo}
                  selectedDate={selectedDate}
                  today={today}
                />
              </>
            ) : null}
            {view === "month" ? (
              <>
                <div className="calendar-desktop-surface">
                  <MonthView
                    anchor={anchor}
                    days={days}
                    entries={projection.entries}
                    filters={filters}
                    nextHref={nextHref}
                    previousHref={previousHref}
                    returnTo={returnTo}
                    selectedDate={selectedDate}
                    today={today}
                  />
                </div>
                <MobileMonthView
                  anchor={anchor}
                  days={days}
                  entries={projection.entries}
                  filters={filters}
                  nextHref={nextHref}
                  previousHref={previousHref}
                  returnTo={returnTo}
                  selectedDate={selectedDate}
                  today={today}
                />
              </>
            ) : null}
          </>
        )}
      </section>

      {!allSourcesFailed ? (
        <CalendarMeetingOverview meetings={projection.meetings} returnTo={returnTo} />
      ) : null}
    </main>
  );
}

function CalendarMeetingOverview({
  meetings,
  returnTo,
}: {
  meetings: readonly CalendarMeetingSummary[];
  returnTo: string;
}) {
  const missingOutput = meetings.filter((meeting) => meeting.isMissingOutput);
  const active = meetings.filter(
    (meeting) => !meeting.isMissingOutput && !meeting.isClosed && !meeting.isCancelled,
  );
  const closed = meetings.filter((meeting) => meeting.isClosed);

  if (!meetings.length) return null;

  return (
    <section className="calendar-meetings" aria-labelledby="calendar-meetings-title">
      <div className="calendar-meetings-heading">
        <h2 className="section-title" id="calendar-meetings-title">
          Meetings & Events
        </h2>
        <span>{meetings.length}</span>
      </div>
      <div className="calendar-meeting-groups">
        <CalendarMeetingGroup
          empty="Todas as Meetings desta janela têm output."
          meetings={missingOutput}
          returnTo={returnTo}
          title="Sem output"
          tone="danger"
        />
        <CalendarMeetingGroup
          empty="Sem Meetings ou Events ativos ou próximos."
          meetings={active}
          returnTo={returnTo}
          title="Agora / próximas"
          tone="default"
        />
        <CalendarMeetingGroup
          empty="Ainda nada fechado nesta janela."
          meetings={closed}
          returnTo={returnTo}
          title="Fechadas"
          tone="muted"
        />
      </div>
    </section>
  );
}

function CalendarMeetingGroup({
  empty,
  meetings,
  returnTo,
  title,
  tone,
}: {
  empty: string;
  meetings: readonly CalendarMeetingSummary[];
  returnTo: string;
  title: string;
  tone: "danger" | "default" | "muted";
}) {
  return (
    <section className={`calendar-meeting-group calendar-meeting-group-${tone}`}>
      <header>
        <h3>{title}</h3>
        <span>{meetings.length}</span>
      </header>
      {meetings.length ? (
        <div className="calendar-meeting-list">
          {meetings.map((meeting) => (
            <Link
              className="calendar-meeting-row"
              href={withReturnTo(meeting.href, returnTo)}
              key={meeting.id}
            >
              <span>
                <strong>{meeting.title}</strong>
                <small>
                  {meeting.kind === "meeting"
                    ? "Meeting"
                    : meeting.kind === "event"
                      ? "Event"
                      : meeting.kind === "vacation"
                        ? "Vacation"
                        : "Google Event"}{" "}
                  · {meeting.ownerDisplayName}
                  {meeting.companyNames.length ? ` · ${meeting.companyNames.join(" · ")}` : ""}
                </small>
              </span>
              <span>
                <time dateTime={meeting.startsAt}>{formatMeetingInterval(meeting)}</time>
                <em>{meeting.statusLabel}</em>
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <p>{empty}</p>
      )}
    </section>
  );
}

function MonthView({
  anchor,
  days,
  entries,
  filters,
  nextHref,
  previousHref,
  returnTo,
  selectedDate,
  today,
}: {
  anchor: string;
  days: string[];
  entries: readonly CalendarEntry[];
  filters: Filters;
  nextHref: string;
  previousHref: string;
  returnTo: string;
  selectedDate: string;
  today: string;
}) {
  return (
    <section aria-label="Mês operacional" className="calendar-month-layout">
      <MonthGrid
        anchor={anchor}
        days={days}
        entries={entries}
        filters={filters}
        nextHref={nextHref}
        previousHref={previousHref}
        returnTo={returnTo}
        selectedDate={selectedDate}
        today={today}
      />
      <SelectedDayPanel
        entries={entries}
        returnTo={returnTo}
        selectedDate={selectedDate}
        today={today}
      />
    </section>
  );
}

function MobileWeekView({
  anchor,
  days,
  entries,
  filters,
  nextHref,
  previousHref,
  returnTo,
  selectedDate,
  today,
}: {
  anchor: string;
  days: string[];
  entries: readonly CalendarEntry[];
  filters: Filters;
  nextHref: string;
  previousHref: string;
  returnTo: string;
  selectedDate: string;
  today: string;
}) {
  return (
    <section aria-label="Semana móvel" className="calendar-mobile-surface calendar-mobile-week">
      <CalendarMobileNavigation nextHref={nextHref} previousHref={previousHref} />
      <div className="calendar-mobile-week-strip">
        {days.map((day) => {
          const count = entries.filter((entry) => entryOccursOn(entry, day)).length;
          return (
            <Link
              aria-current={day === selectedDate ? "date" : undefined}
              className={`${day === selectedDate ? "calendar-mobile-day calendar-mobile-day-selected" : "calendar-mobile-day"}${day === today ? " calendar-mobile-day-today" : ""}`}
              href={calendarHref("week", anchor, filters, day)}
              key={day}
            >
              <span>{weekdayLetter(day)}</span>
              <strong>{new Date(`${day}T12:00:00.000Z`).getUTCDate()}</strong>
              {count ? <i aria-label={`${count} compromissos`} /> : <i aria-hidden="true" />}
            </Link>
          );
        })}
      </div>
      <SelectedDayPanel
        entries={entries}
        mobile
        returnTo={returnTo}
        selectedDate={selectedDate}
        today={today}
      />
    </section>
  );
}

function MobileMonthView({
  anchor,
  days,
  entries,
  filters,
  nextHref,
  previousHref,
  returnTo,
  selectedDate,
  today,
}: {
  anchor: string;
  days: string[];
  entries: readonly CalendarEntry[];
  filters: Filters;
  nextHref: string;
  previousHref: string;
  returnTo: string;
  selectedDate: string;
  today: string;
}) {
  return (
    <section aria-label="Mês móvel" className="calendar-mobile-surface calendar-mobile-month">
      <CalendarMobileNavigation nextHref={nextHref} previousHref={previousHref} />
      <MonthGrid
        anchor={anchor}
        days={days}
        entries={entries}
        filters={filters}
        mobile
        returnTo={returnTo}
        selectedDate={selectedDate}
        today={today}
      />
      <SelectedDayPanel
        entries={entries}
        mobile
        returnTo={returnTo}
        selectedDate={selectedDate}
        today={today}
      />
    </section>
  );
}

function MonthGrid({
  anchor,
  days,
  entries,
  filters,
  mobile = false,
  nextHref,
  previousHref,
  returnTo,
  selectedDate,
  today,
}: {
  anchor: string;
  days: string[];
  entries: readonly CalendarEntry[];
  filters: Filters;
  mobile?: boolean;
  nextHref?: string;
  previousHref?: string;
  returnTo: string;
  selectedDate: string;
  today: string;
}) {
  return (
    <div
      className={
        mobile ? "calendar-month-shell calendar-month-shell-mobile" : "calendar-month-shell"
      }
    >
      {!mobile && nextHref && previousHref ? (
        <CalendarGridNavigation nextHref={nextHref} previousHref={previousHref} />
      ) : null}
      <div aria-hidden="true" className="calendar-month-weekdays">
        {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <div className={mobile ? "calendar-month calendar-month-mobile" : "calendar-month"}>
        {days.map((day) => {
          const items = entries.filter((entry) => entryOccursOn(entry, day));
          const outside = day.slice(0, 7) !== anchor.slice(0, 7);
          return (
            <section
              className={`calendar-month-day${outside ? " calendar-month-day-outside" : ""}${day === today ? " calendar-day-today" : ""}${day === selectedDate ? " calendar-month-day-selected" : ""}`}
              key={day}
            >
              <Link
                aria-label={`Ver compromissos de ${formatFullDate(day)}`}
                className="calendar-month-day-select"
                href={calendarHref("month", anchor, filters, day)}
              />
              <DayHeading compact day={day} today={today} />
              {mobile ? (
                <div aria-label={`${items.length} compromissos`} className="calendar-month-dots">
                  {items.slice(0, 3).map((entry) => (
                    <i
                      className={`calendar-month-dot calendar-month-dot-${entry.sourceType}`}
                      key={entry.entryKey}
                    />
                  ))}
                </div>
              ) : (
                <div className="calendar-month-entries">
                  {items.slice(0, 3).map((entry) => (
                    <CalendarEntryLink
                      compact
                      entry={entry}
                      key={`${entry.entryKey}:${day}`}
                      returnTo={returnTo}
                    />
                  ))}
                  {items.length > 3 ? (
                    <span className="calendar-more">+{items.length - 3}</span>
                  ) : null}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function SelectedDayPanel({
  entries,
  mobile = false,
  returnTo,
  selectedDate,
  today,
}: {
  entries: readonly CalendarEntry[];
  mobile?: boolean;
  returnTo: string;
  selectedDate: string;
  today: string;
}) {
  const items = entries.filter((entry) => entryOccursOn(entry, selectedDate));
  const [isCollapsed, setIsCollapsed] = useState(false);
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    if (deltaY > 40) {
      setIsCollapsed(true);
    } else if (deltaY < -40) {
      setIsCollapsed(false);
    }
    touchStartY.current = null;
  };

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => !prev);
  };

  return (
    <aside
      aria-label={`Compromissos de ${formatFullDate(selectedDate)}`}
      className={
        mobile
          ? `calendar-day-panel calendar-day-panel-mobile${isCollapsed ? " is-collapsed" : ""}`
          : "calendar-day-panel"
      }
      onTouchEnd={mobile ? handleTouchEnd : undefined}
      onTouchStart={mobile ? handleTouchStart : undefined}
    >
      {mobile && (
        <button
          aria-label={isCollapsed ? "Expandir painel do dia" : "Recolher painel do dia"}
          className="sheet-drag-handle-button"
          onClick={toggleCollapsed}
          type="button"
        >
          <span className="sheet-drag-handle" aria-hidden="true" />
        </button>
      )}
      <header
        onClick={mobile ? toggleCollapsed : undefined}
        style={{ cursor: mobile ? "pointer" : "default" }}
      >
        <div>
          <span>{selectedDate === today ? "Hoje" : weekdayLong(selectedDate)}</span>
          <h2>{formatSelectedDate(selectedDate)}</h2>
        </div>
        <Link
          aria-label={`Criar em ${formatFullDate(selectedDate)}`}
          className="calendar-day-add"
          href={`/meetings/new?date=${selectedDate}&returnTo=${encodeURIComponent(returnTo)}`}
          onClick={(e) => e.stopPropagation()}
        >
          +
        </Link>
      </header>
      {items.length ? (
        <div className="calendar-day-panel-list">
          {items.map((entry) => (
            <DayPanelEntry entry={entry} key={entry.entryKey} returnTo={returnTo} />
          ))}
        </div>
      ) : (
        <p className="calendar-day-panel-empty">Sem compromissos.</p>
      )}
    </aside>
  );
}

function DayPanelEntry({ entry, returnTo }: { entry: CalendarEntry; returnTo: string }) {
  const time = formatEntryTime(entry);
  return (
    <Link
      className={`calendar-day-panel-entry calendar-day-panel-entry-${entry.sourceType}${entry.tone ? ` calendar-day-panel-entry-${entry.tone}` : ""}${entry.sourceLabel === "Vacation" ? " calendar-day-panel-entry-vacation" : ""}${entry.isOverdue ? " calendar-day-panel-entry-overdue" : ""}`}
      href={withReturnTo(entry.href, returnTo)}
    >
      <i aria-hidden="true" />
      <span>
        <strong>{entry.title}</strong>
        <small>
          {entry.sourceLabel}
          {entry.owner ? ` · ${entry.owner.displayName}` : ""}
        </small>
      </span>
      <time dateTime={entry.start}>{time}</time>
    </Link>
  );
}

function CalendarGridNavigation({ nextHref, previousHref }: { nextHref: string; previousHref: string }) {
  return (
    <nav aria-label="Navegar no Calendar" className="calendar-grid-navigation">
      <Link aria-label="Período anterior" href={previousHref}>
        <ChevronLeft aria-hidden="true" />
      </Link>
      <Link aria-label="Período seguinte" href={nextHref}>
        <ChevronRight aria-hidden="true" />
      </Link>
    </nav>
  );
}

function CalendarMobileNavigation({ nextHref, previousHref }: { nextHref: string; previousHref: string }) {
  return (
    <nav aria-label="Navegar no Calendar" className="calendar-mobile-navigation">
      <Link aria-label="Período anterior" href={previousHref}>
        <ChevronLeft aria-hidden="true" />
      </Link>
      <Link aria-label="Período seguinte" href={nextHref}>
        <ChevronRight aria-hidden="true" />
      </Link>
    </nav>
  );
}

function DayHeading({
  compact = false,
  day,
  today,
}: {
  compact?: boolean;
  day: string;
  today: string;
}) {
  const date = new Date(`${day}T12:00:00.000Z`);
  return (
    <header className="calendar-day-heading">
      <span>
        {new Intl.DateTimeFormat("pt-PT", { weekday: compact ? "short" : "long" }).format(date)}
      </span>
      <strong>
        {compact
          ? date.getUTCDate()
          : new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short" }).format(date)}
      </strong>
      {day === today ? <em>Hoje</em> : null}
    </header>
  );
}

function CalendarEntryLink({
  compact = false,
  entry,
  returnTo,
}: {
  compact?: boolean;
  entry: CalendarEntry;
  returnTo: string;
}) {
  const contexts = entry.context.map((item) => item.label).join(" · ");
  const time = entry.allDay
    ? null
    : new Intl.DateTimeFormat("pt-PT", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Lisbon",
      }).format(new Date(entry.start));
  const label = `${entry.sourceLabel}: ${entry.title}. ${entry.sourceStatus.label}. ${time ? `Às ${time}.` : "Dia inteiro."}`;
  const content = (
    <>
      <span className="calendar-entry-topline">
        <b>{entry.sourceLabel}</b>
        {time ? (
          <time dateTime={entry.start}>{time}</time>
        ) : (
          <span>{BASIS_LABELS[entry.temporalBasis]}</span>
        )}
      </span>
      <strong>{entry.title}</strong>
      {!compact ? (
        <span className="calendar-entry-meta">
          {entry.sourceStatus.label}
          {entry.owner ? ` · ${entry.owner.displayName}` : ""}
          {contexts ? ` · ${contexts}` : ""}
        </span>
      ) : null}
    </>
  );
  const className = `calendar-entry calendar-entry-${entry.sourceType}${entry.tone ? ` calendar-entry-${entry.tone}` : ""}${entry.sourceLabel === "Vacation" ? " calendar-entry-vacation" : ""}${entry.isOverdue ? " calendar-entry-overdue" : ""}${entry.isCancelled ? " calendar-entry-cancelled" : ""}${compact ? " calendar-entry-compact" : ""}`;
  return (
    <Link aria-label={label} className={className} href={withReturnTo(entry.href, returnTo)}>
      {content}
    </Link>
  );
}

function calendarHref(view: CalendarView, date: string, filters: Filters, selectedDate?: string) {
  const params = new URLSearchParams({ view, date });
  if (selectedDate) params.set("day", selectedDate);
  if (filters.sourceType) params.set("type", filters.sourceType);
  if (filters.owner) params.set("owner", filters.owner);
  if (filters.history) params.set("history", "1");
  return `/calendar?${params.toString()}`;
}

function formatEntryTime(entry: CalendarEntry) {
  if (entry.allDay) return "Dia inteiro";
  const formatter = new Intl.DateTimeFormat("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Lisbon",
  });
  const start = formatter.format(new Date(entry.start));
  return entry.end ? `${start}–${formatter.format(new Date(entry.end))}` : start;
}

function formatFullDate(day: string) {
  return new Intl.DateTimeFormat("pt-PT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${day}T12:00:00.000Z`));
}

function formatSelectedDate(day: string) {
  return new Intl.DateTimeFormat("pt-PT", {
    day: "numeric",
    month: "long",
  }).format(new Date(`${day}T12:00:00.000Z`));
}

function formatMonthYear(day: string) {
  return new Intl.DateTimeFormat("pt-PT", { month: "long", year: "numeric" }).format(
    new Date(`${day}T12:00:00.000Z`),
  );
}

function weekdayLong(day: string) {
  return new Intl.DateTimeFormat("pt-PT", { weekday: "long" }).format(
    new Date(`${day}T12:00:00.000Z`),
  );
}

function weekdayLetter(day: string) {
  return new Intl.DateTimeFormat("pt-PT", { weekday: "narrow" }).format(
    new Date(`${day}T12:00:00.000Z`),
  );
}

function formatMeetingInterval(meeting: CalendarMeetingSummary) {
  const formatter = new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    timeZone: "Europe/Lisbon",
  });
  return `${formatter.format(new Date(meeting.startsAt))}–${formatter.format(new Date(meeting.endsAt))}`;
}
