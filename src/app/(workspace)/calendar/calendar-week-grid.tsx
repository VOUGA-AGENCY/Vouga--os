"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

import { withReturnTo } from "@/foundation/navigation/return-to";
import type { CalendarEntry } from "@/projections/calendar/calendar";
import { entryOccursOn, lisbonLocalTimeToIso } from "@/projections/calendar/calendar-time";

import { layoutTimedEntries, type CalendarWeekPlacement } from "./calendar-week-layout";

const SLOT_MINUTES = 30;
const SLOTS_PER_DAY = 48;
const HOUR_HEIGHT = 56;
const DAY_HEIGHT = HOUR_HEIGHT * 24;

type Selection = Readonly<{ day: string; startSlot: number; endSlot: number }>;

export function CalendarWeekGrid({
  days,
  entries,
  returnTo,
  today,
}: {
  days: readonly string[];
  entries: readonly CalendarEntry[];
  returnTo: string;
  today: string;
}) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Selection | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const allDayEntries = days.map((day) => entries.filter((entry) => entry.allDay && entryOccursOn(entry, day)));
  const hasAllDayEntries = allDayEntries.some((dayEntries) => dayEntries.length > 0);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = HOUR_HEIGHT * 7;
  }, []);

  function beginSelection(day: string, event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    const slot = slotFromPointer(event);
    const next = { day, startSlot: slot, endSlot: slot };
    dragRef.current = next;
    setSelection(next);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function moveSelection(event: ReactPointerEvent<HTMLDivElement>) {
    const current = dragRef.current;
    if (!current) return;
    const next = { ...current, endSlot: slotFromPointer(event) };
    dragRef.current = next;
    setSelection(next);
  }

  function finishSelection(event: ReactPointerEvent<HTMLDivElement>) {
    const current = dragRef.current;
    if (!current) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current = null;
    setSelection(null);
    openCreate(current.day, current.startSlot, current.endSlot === current.startSlot
      ? Math.min(current.startSlot + 1, SLOTS_PER_DAY - 1)
      : current.endSlot);
  }

  function openCreate(day: string, firstSlot: number, lastSlot: number) {
    const startSlot = Math.min(firstSlot, lastSlot);
    const endSlot = Math.min(Math.max(firstSlot, lastSlot) + 1, SLOTS_PER_DAY);
    const startsAt = instantForSlot(day, startSlot);
    const endsAt = instantForSlot(day, endSlot);
    const params = new URLSearchParams({ endsAt, returnTo, startsAt });
    router.push(`/meetings/new?${params.toString()}`);
  }

  return (
    <section aria-label="Semana, das 00:00 às 24:00" className="calendar-week-hourly">
      <div className="calendar-week-header">
        <span aria-hidden="true" />
        {days.map((day) => (
          <button
            className={day === today ? "calendar-week-heading calendar-week-heading-today" : "calendar-week-heading"}
            key={day}
            onClick={() => openCreate(day, 18, 19)}
            type="button"
          >
            <span>{weekday(day)}</span>
            <strong>{new Date(`${day}T12:00:00.000Z`).getUTCDate()}</strong>
          </button>
        ))}
      </div>

      {hasAllDayEntries ? (
        <div className="calendar-week-all-day">
          <span>dia</span>
          {days.map((day, dayIndex) => (
            <div key={day}>
              {allDayEntries[dayIndex].map((entry) => (
                <WeekEvent entry={entry} key={`${entry.entryKey}:${day}`} returnTo={returnTo} />
              ))}
            </div>
          ))}
        </div>
      ) : null}

      <div className="calendar-week-scroll" ref={scrollRef}>
        <div className="calendar-week-time-grid" style={{ height: DAY_HEIGHT }}>
          <div className="calendar-week-hours" aria-hidden="true">
            {Array.from({ length: 24 }, (_, hour) => (
              <time key={hour} style={{ top: hour * HOUR_HEIGHT }}>
                {String(hour).padStart(2, "0")}:00
              </time>
            ))}
          </div>
          <div className="calendar-week-columns">
            {days.map((day) => (
              <div
                aria-label={`Criar em ${day}`}
                className={day === today ? "calendar-week-column calendar-week-column-today" : "calendar-week-column"}
                key={day}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openCreate(day, 18, 19);
                  }
                }}
                onPointerDown={(event) => beginSelection(day, event)}
                onPointerMove={moveSelection}
                onPointerUp={finishSelection}
                role="button"
                style={{ height: DAY_HEIGHT }}
                tabIndex={0}
              >
                {selection?.day === day ? <SelectionBlock selection={selection} /> : null}
                {layoutTimedEntries(
                  entries.filter((entry) => !entry.allDay && entryOccursOn(entry, day)),
                  day,
                ).map((placement) => (
                    <WeekEvent
                      entry={placement.entry}
                      key={`${placement.entry.entryKey}:${day}`}
                      placement={placement}
                      returnTo={returnTo}
                      timed
                    />
                  ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function SelectionBlock({ selection }: { selection: Selection }) {
  const start = Math.min(selection.startSlot, selection.endSlot);
  const end = Math.max(selection.startSlot, selection.endSlot) + 1;
  return (
    <span
      className="calendar-week-selection"
      style={{ height: slotsToPixels(end - start), top: slotsToPixels(start) }}
    />
  );
}

function WeekEvent({
  entry,
  placement,
  returnTo,
  timed = false,
}: {
  entry: CalendarEntry;
  placement?: CalendarWeekPlacement;
  returnTo: string;
  timed?: boolean;
}) {
  const time = entry.allDay ? null : timeParts(entry.start);
  const style = timed && placement ? {
    height: placement.height,
    left: `calc(${(placement.column / placement.columnCount) * 100}% + 3px)`,
    top: placement.top,
    width: `calc(${100 / placement.columnCount}% - 6px)`,
  } : undefined;
  const className = `calendar-week-event calendar-week-event-${entry.sourceType}${entry.tone ? ` calendar-week-event-${entry.tone}` : ""}${entry.sourceLabel === "Vacation" ? " calendar-week-event-vacation" : ""}${entry.isOverdue ? " calendar-week-event-overdue" : ""}${placement?.compact ? " calendar-week-event-compact" : ""}`;
  const content = (
    <>
      <strong>{entry.title}</strong>
      {time ? <time dateTime={entry.start}>{time.label}</time> : null}
    </>
  );
  return (
    <Link
      className={className}
      href={withReturnTo(entry.href, returnTo)}
      onPointerDown={(event) => event.stopPropagation()}
      style={style}
    >
      {content}
    </Link>
  );
}

function timeParts(value: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    timeZone: "Europe/Lisbon",
  }).formatToParts(new Date(value));
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);
  return { label: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`, minutes: hour * 60 + minute };
}

function slotFromPointer(event: ReactPointerEvent<HTMLDivElement>) {
  const rect = event.currentTarget.getBoundingClientRect();
  const y = Math.max(0, Math.min(rect.height - 1, event.clientY - rect.top));
  return Math.min(SLOTS_PER_DAY - 1, Math.floor((y / rect.height) * SLOTS_PER_DAY));
}

function instantForSlot(day: string, slot: number) {
  if (slot === SLOTS_PER_DAY) return lisbonLocalTimeToIso(nextDay(day), 0, 0);
  const minutes = slot * SLOT_MINUTES;
  return lisbonLocalTimeToIso(day, Math.floor(minutes / 60), minutes % 60);
}

function nextDay(day: string) {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function slotsToPixels(slots: number) {
  return (slots * SLOT_MINUTES * HOUR_HEIGHT) / 60;
}

function weekday(day: string) {
  const labels = ["dom.", "seg.", "ter.", "qua.", "qui.", "sex.", "sáb."];
  return labels[new Date(`${day}T12:00:00.000Z`).getUTCDay()];
}
