import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { events as eventsApi } from "@/lib/data";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type Event = {
  id: string;
  title: string;
  kind: string;
  starts_at: string;
  ends_at: string | null;
  source_type: string | null;
  source_id: string | null;
};

type ViewMode = "month" | "week";

const DAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const MONTH_NAMES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

const KIND_STYLE: Record<string, { dot: string; rail: string; card: string; label: string }> = {
  meeting: {
    dot: "bg-[#3d8f7d]",
    rail: "bg-[#3d8f7d]",
    card: "border-[#3d8f7d]/25 bg-[#eff8f5]",
    label: "Reunião",
  },
  task_due: {
    dot: "bg-[#4f8df5]",
    rail: "bg-[#4f8df5]",
    card: "border-[#4f8df5]/25 bg-[#eff4ff]",
    label: "Prazo",
  },
  custom: {
    dot: "bg-[#c97800]",
    rail: "bg-[#c97800]",
    card: "border-[#c97800]/25 bg-[#fff7e7]",
    label: "Evento",
  },
  social: {
    dot: "bg-[#ba4f7a]",
    rail: "bg-[#ba4f7a]",
    card: "border-[#ba4f7a]/25 bg-[#fff0f6]",
    label: "Equipa",
  },
};

function styleFor(kind: string) {
  return KIND_STYLE[kind] ?? KIND_STYLE.custom;
}

function startOfWeek(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function timeLabel(date: string) {
  return new Date(date).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
}

function shortDate(date: Date) {
  return date.toLocaleDateString("pt-PT", { day: "2-digit", month: "short" });
}

function durationLabel(event: Event) {
  if (!event.ends_at) return timeLabel(event.starts_at);
  return `${timeLabel(event.starts_at)} - ${timeLabel(event.ends_at)}`;
}

function buildMonthDays(cursor: Date) {
  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = new Date(monthEnd);
  gridEnd.setDate(monthEnd.getDate() + ((7 - ((monthEnd.getDay() + 6) % 7) - 1) % 7));
  gridEnd.setHours(23, 59, 59, 999);

  const days: Date[] = [];
  const d = new Date(gridStart);
  while (d <= gridEnd) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return { gridStart, gridEnd, days };
}

export function CompanyCalendar({
  onMeetingClick,
  onNewMeeting,
  onEventDelete,
  defaultView = "week",
}: {
  onMeetingClick?: (meetingId: string) => void;
  onNewMeeting?: (date: Date) => void;
  onEventDelete?: (eventId: string) => void;
  defaultView?: ViewMode;
} = {}) {
  const [view, setView] = useState<ViewMode>(defaultView);
  const [cursor, setCursor] = useState(() => startOfWeek(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => {
    const d = new Date();
    d.setHours(9, 0, 0, 0);
    return d;
  });
  const today = new Date();

  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = startOfWeek(cursor);
        d.setDate(d.getDate() + i);
        return d;
      }),
    [cursor],
  );

  const month = useMemo(() => buildMonthDays(cursor), [cursor]);
  const range = useMemo(() => {
    if (view === "month") return { start: month.gridStart, end: month.gridEnd };
    const start = startOfWeek(cursor);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }, [cursor, month.gridEnd, month.gridStart, view]);

  useEffect(() => {
    if (!weekDays.some((day) => sameDay(day, selectedDay))) {
      setSelectedDay(new Date(weekDays[0]));
    }
  }, [selectedDay, weekDays]);

  const eventsQ = useQuery({
    queryKey: ["company-calendar", view, range.start.toISOString(), range.end.toISOString()],
    queryFn: () => eventsApi.listRange(range.start.toISOString(), range.end.toISOString()) as Promise<Event[]>,
  });

  const eventsByDay = useMemo(() => {
    const map = new Map<string, Event[]>();
    (eventsQ.data ?? []).forEach((event) => {
      const key = dayKey(new Date(event.starts_at));
      map.set(
        key,
        [...(map.get(key) ?? []), event].sort(
          (a, b) => +new Date(a.starts_at) - +new Date(b.starts_at),
        ),
      );
    });
    return map;
  }, [eventsQ.data]);

  const selectedEvents = eventsByDay.get(dayKey(selectedDay)) ?? [];
  const upcoming = useMemo(
    () =>
      [...(eventsQ.data ?? [])]
        .filter((event) => new Date(event.starts_at).getTime() >= new Date().setHours(0, 0, 0, 0))
        .sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at))
        .slice(0, 5),
    [eventsQ.data],
  );

  const label = useMemo(() => {
    if (view === "month") return `${MONTH_NAMES[cursor.getMonth()]} ${cursor.getFullYear()}`;
    return `${shortDate(weekDays[0])} - ${shortDate(weekDays[6])}`;
  }, [cursor, view, weekDays]);

  const shift = (dir: 1 | -1) => {
    if (view === "month") setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1));
    else {
      const next = new Date(cursor);
      next.setDate(cursor.getDate() + dir * 7);
      setCursor(startOfWeek(next));
    }
  };

  const goToday = () => {
    const d = new Date();
    d.setHours(9, 0, 0, 0);
    setCursor(view === "month" ? new Date(d.getFullYear(), d.getMonth(), 1) : startOfWeek(d));
    setSelectedDay(d);
  };

  const createAt = (date: Date, hour = 9) => {
    const d = new Date(date);
    d.setHours(hour, 0, 0, 0);
    onNewMeeting?.(d);
  };

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-[#1a1813]/10 bg-[#e9e5d8] shadow-[0_28px_80px_-60px_rgba(26,24,19,0.8)]">
      <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_50%_18%,rgba(201,120,0,0.18),transparent_28%),radial-gradient(circle_at_60%_70%,rgba(79,141,245,0.12),transparent_26%)] lg:block" />

      <header className="relative z-10 flex flex-col gap-4 border-b border-[#1a1813]/10 bg-[#f4f0e5]/75 px-4 py-4 backdrop-blur md:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[#1a1813] text-[#f6f1e6]">
              <CalendarDays className="h-4 w-4" />
            </span>
            <div>
              <p className="vouga-label">Agenda da casa</p>
              <h2 className="mt-0.5 truncate text-2xl tracking-tight text-[#1a1813] md:text-3xl">
                {label}
              </h2>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full border border-[#1a1813]/10 bg-white/50 p-1">
            <button
              onClick={() => setView("week")}
              className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
                view === "week" ? "bg-[#1a1813] text-[#f6f1e6]" : "text-[#615e54] hover:text-[#1a1813]"
              }`}
            >
              Semana
            </button>
            <button
              onClick={() => setView("month")}
              className={`hidden rounded-full px-3 py-1.5 text-xs transition-colors sm:block ${
                view === "month" ? "bg-[#1a1813] text-[#f6f1e6]" : "text-[#615e54] hover:text-[#1a1813]"
              }`}
            >
              Mês
            </button>
          </div>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => shift(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="rounded-full bg-white/55" onClick={goToday}>
            Hoje
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => shift(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button className="rounded-full px-4" onClick={() => createAt(selectedDay)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Evento
          </Button>
        </div>
      </header>

      {view === "week" ? (
        <>
        <MobileAgenda
          weekDays={weekDays}
          selectedDay={selectedDay}
          selectedEvents={selectedEvents}
          eventsByDay={eventsByDay}
          today={today}
          onSelectDay={setSelectedDay}
          onCreate={createAt}
          onMeetingClick={onMeetingClick}
          onEventDelete={onEventDelete}
        />
        <div className="relative z-10 hidden gap-px bg-[#1a1813]/10 lg:grid lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="bg-[#ece8de] p-4 md:p-5">
            <div className="rounded-2xl bg-[#1a1813] p-5 text-[#f6f1e6]">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#f6f1e6]/55">
                Foco
              </p>
              <p className="mt-4 font-serif text-7xl leading-none">
                {String(selectedDay.getDate()).padStart(2, "0")}
              </p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="text-sm text-[#f6f1e6]/72">
                  {selectedDay.toLocaleDateString("pt-PT", {
                    weekday: "long",
                    month: "long",
                  })}
                </p>
                <span className="rounded-full bg-[#f6f1e6]/12 px-2.5 py-1 font-mono text-[10px]">
                  {selectedEvents.length} evento{selectedEvents.length === 1 ? "" : "s"}
                </span>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-[#1a1813]/10 bg-[#f6f1e6]/70 p-3">
              <div className="grid grid-cols-7 gap-1 text-center">
                {DAY_LABELS.map((d) => (
                  <span key={d} className="py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                    {d.slice(0, 1)}
                  </span>
                ))}
                {month.days.map((day) => {
                  const isSelected = sameDay(day, selectedDay);
                  const hasEvents = (eventsByDay.get(dayKey(day)) ?? []).length > 0;
                  const inMonth = day.getMonth() === cursor.getMonth();
                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      onClick={() => {
                        setSelectedDay(day);
                        setCursor(startOfWeek(day));
                      }}
                      className={`relative grid aspect-square place-items-center rounded-full text-xs transition-colors ${
                        isSelected
                          ? "bg-[#1a1813] text-[#f6f1e6]"
                          : inMonth
                            ? "text-[#1a1813] hover:bg-white"
                            : "text-muted-foreground/35"
                      }`}
                    >
                      {day.getDate()}
                      {hasEvents && (
                        <span
                          className={`absolute bottom-1 h-1 w-1 rounded-full ${
                            isSelected ? "bg-[#f6f1e6]" : "bg-[#c97800]"
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-[#1a1813]/10 bg-[#f6f1e6]/70 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="vouga-label">Próximos</p>
                <Sparkles className="h-3.5 w-3.5 text-[#c97800]" />
              </div>
              <div className="space-y-2">
                {upcoming.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => {
                      const d = new Date(event.starts_at);
                      setSelectedDay(d);
                      setCursor(startOfWeek(d));
                    }}
                    className="flex w-full items-start gap-2 rounded-xl px-2 py-2 text-left transition-colors hover:bg-white/70"
                  >
                    <span className={`mt-1.5 h-2 w-2 rounded-full ${styleFor(event.kind).dot}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{event.title}</span>
                      <span className="block font-mono text-[10px] text-muted-foreground">
                        {shortDate(new Date(event.starts_at))} · {timeLabel(event.starts_at)}
                      </span>
                    </span>
                  </button>
                ))}
                {upcoming.length === 0 && (
                  <p className="rounded-xl bg-white/45 px-3 py-3 text-sm text-muted-foreground">
                    Sem eventos próximos. Parece uma semana respirável.
                  </p>
                )}
              </div>
            </div>
          </aside>

          <main className="min-w-0 bg-[#f4f0e5] p-4 md:p-6">
            <div className="-mx-4 mb-5 overflow-x-auto px-4 md:-mx-6 md:px-6">
              <div className="flex min-w-max gap-2">
                {weekDays.map((day, i) => {
                  const dayEvents = eventsByDay.get(dayKey(day)) ?? [];
                  const isSelected = sameDay(day, selectedDay);
                  const isToday = sameDay(day, today);
                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      onClick={() => setSelectedDay(day)}
                      className={`w-[112px] rounded-2xl border p-3 text-left transition-all ${
                        isSelected
                          ? "border-[#1a1813] bg-[#1a1813] text-[#f6f1e6] shadow-lg shadow-[#1a1813]/10"
                          : "border-[#1a1813]/10 bg-[#fbfaf6]/80 hover:bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-mono text-[10px] uppercase tracking-[0.14em] ${isSelected ? "text-[#f6f1e6]/60" : "text-muted-foreground"}`}>
                          {DAY_LABELS[i]}
                        </span>
                        {isToday && <span className={`h-2 w-2 rounded-full ${isSelected ? "bg-[#f6f1e6]" : "bg-[#e11919]"}`} />}
                      </div>
                      <p className="mt-2 font-serif text-4xl leading-none">{String(day.getDate()).padStart(2, "0")}</p>
                      <div className="mt-3 flex gap-1">
                        {dayEvents.slice(0, 4).map((event) => (
                          <span key={event.id} className={`h-1.5 flex-1 rounded-full ${styleFor(event.kind).dot}`} />
                        ))}
                        {dayEvents.length === 0 && <span className={`h-1.5 flex-1 rounded-full ${isSelected ? "bg-[#f6f1e6]/20" : "bg-[#1a1813]/10"}`} />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_210px]">
              <div className="rounded-3xl border border-[#1a1813]/10 bg-[#fbfaf6] p-4 md:p-6">
                <div className="flex flex-col gap-3 border-b border-[#1a1813]/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="vouga-label">Plano do dia</p>
                    <h3 className="mt-2 text-4xl tracking-tight md:text-5xl">
                      {selectedDay.toLocaleDateString("pt-PT", { weekday: "long" })}
                    </h3>
                  </div>
                  <Button variant="outline" className="w-fit rounded-full bg-white/65" onClick={() => createAt(selectedDay)}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Adicionar
                  </Button>
                </div>

                <div className="mt-5 space-y-3">
                  {selectedEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onMeetingClick={onMeetingClick}
                      onEventDelete={onEventDelete}
                    />
                  ))}
                  {selectedEvents.length === 0 && (
                    <div className="grid min-h-[280px] place-items-center rounded-2xl border border-dashed border-[#1a1813]/18 bg-[#f1eee6] px-6 text-center">
                      <div>
                        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white/80 text-[#c97800]">
                          <Plus className="h-5 w-5" />
                        </div>
                        <h4 className="mt-4 text-2xl">Dia limpo.</h4>
                        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                          Cria reuniões, prazos ou blocos de trabalho sem transformar isto numa folha de cálculo.
                        </p>
                        <Button className="mt-5 rounded-full" onClick={() => createAt(selectedDay)}>
                          Criar primeiro evento
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="hidden rounded-3xl border border-[#1a1813]/10 bg-[#efe9dc] p-4 xl:block">
                <p className="vouga-label">Ritmo</p>
                <div className="mt-5 space-y-3">
                  {[9, 11, 14, 16, 18].map((hour) => (
                    <button
                      key={hour}
                      type="button"
                      onClick={() => createAt(selectedDay, hour)}
                      className="flex w-full items-center justify-between rounded-2xl border border-[#1a1813]/8 bg-[#fbfaf6]/70 px-3 py-3 text-left text-sm transition-colors hover:bg-white"
                    >
                      <span className="font-mono text-xs text-muted-foreground">{String(hour).padStart(2, "0")}:00</span>
                      <Plus className="h-3.5 w-3.5 text-[#c97800]" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </main>
        </div>
        </>
      ) : (
        <MonthView
          cursor={cursor}
          days={month.days}
          eventsByDay={eventsByDay}
          onSelectDay={(day) => {
            setSelectedDay(day);
            setCursor(startOfWeek(day));
            setView("week");
          }}
          onNewMeeting={onNewMeeting}
          onEventDelete={onEventDelete}
        />
      )}
    </section>
  );
}

function MobileAgenda({
  weekDays,
  selectedDay,
  selectedEvents,
  eventsByDay,
  today,
  onSelectDay,
  onCreate,
  onMeetingClick,
  onEventDelete,
}: {
  weekDays: Date[];
  selectedDay: Date;
  selectedEvents: Event[];
  eventsByDay: Map<string, Event[]>;
  today: Date;
  onSelectDay: (day: Date) => void;
  onCreate: (date: Date, hour?: number) => void;
  onMeetingClick?: (meetingId: string) => void;
  onEventDelete?: (eventId: string) => void;
}) {
  return (
    <div className="relative z-10 bg-[#f4f0e5] p-3 lg:hidden">
      <div className="-mx-3 overflow-x-auto px-3">
        <div className="flex min-w-max gap-2">
          {weekDays.map((day, i) => {
            const dayEvents = eventsByDay.get(dayKey(day)) ?? [];
            const isSelected = sameDay(day, selectedDay);
            const isToday = sameDay(day, today);
            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => onSelectDay(day)}
                className={`w-[76px] rounded-2xl border p-2 text-left ${
                  isSelected ? "border-[#1a1813] bg-[#1a1813] text-[#f6f1e6]" : "border-[#1a1813]/10 bg-[#fbfaf6]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-mono text-[9px] uppercase tracking-[0.12em] ${isSelected ? "text-[#f6f1e6]/60" : "text-muted-foreground"}`}>
                    {DAY_LABELS[i]}
                  </span>
                  {isToday && <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-[#f6f1e6]" : "bg-[#e11919]"}`} />}
                </div>
                <p className="mt-2 font-serif text-3xl leading-none">{String(day.getDate()).padStart(2, "0")}</p>
                <p className={`mt-1 font-mono text-[9px] ${isSelected ? "text-[#f6f1e6]/55" : "text-muted-foreground"}`}>
                  {dayEvents.length} ev.
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-[#1a1813]/10 bg-[#fbfaf6] p-3">
        <div className="flex items-end justify-between gap-3 border-b border-[#1a1813]/10 pb-3">
          <div>
            <p className="vouga-label">Hoje no calendário</p>
            <h3 className="mt-1 text-3xl tracking-tight">
              {selectedDay.toLocaleDateString("pt-PT", { weekday: "long", day: "2-digit" })}
            </h3>
          </div>
          <Button size="sm" className="shrink-0 rounded-full" onClick={() => onCreate(selectedDay)}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            Evento
          </Button>
        </div>

        <div className="mt-3 space-y-2">
          {selectedEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onMeetingClick={onMeetingClick}
              onEventDelete={onEventDelete}
            />
          ))}
          {selectedEvents.length === 0 && (
            <button
              type="button"
              onClick={() => onCreate(selectedDay)}
              className="w-full rounded-2xl border border-dashed border-[#1a1813]/15 bg-[#f1eee6] px-4 py-8 text-center text-sm text-muted-foreground"
            >
              Dia sem eventos. Toca para criar um.
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function EventCard({
  event,
  onMeetingClick,
  onEventDelete,
}: {
  event: Event;
  onMeetingClick?: (meetingId: string) => void;
  onEventDelete?: (eventId: string) => void;
}) {
  const style = styleFor(event.kind);
  const clickable = event.kind === "meeting" && event.source_type === "meeting" && event.source_id && onMeetingClick;

  return (
    <article className={`group relative overflow-hidden rounded-2xl border ${style.card} p-3 sm:p-4`}>
      <div className={`absolute bottom-4 left-4 top-4 w-1 rounded-full ${style.rail}`} />
      <div className="pl-5">
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            disabled={!clickable}
            onClick={() => clickable && onMeetingClick!(event.source_id!)}
            className="min-w-0 flex-1 text-left disabled:cursor-default"
          >
            <span className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/70 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[#615e54]">
                {style.label}
              </span>
              <span className="inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                {durationLabel(event)}
              </span>
            </span>
            <h4 className="mt-3 text-xl leading-none tracking-tight text-[#1a1813] sm:text-2xl">{event.title}</h4>
          </button>

          {onEventDelete && (
            <button
              type="button"
              onClick={() => onEventDelete(event.id)}
              className="grid h-8 w-8 flex-none place-items-center rounded-full bg-white/65 text-muted-foreground transition-colors hover:bg-white hover:text-destructive md:opacity-0 md:group-hover:opacity-100"
              title="Apagar evento"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function MonthView({
  cursor,
  days,
  eventsByDay,
  onSelectDay,
  onNewMeeting,
  onEventDelete,
}: {
  cursor: Date;
  days: Date[];
  eventsByDay: Map<string, Event[]>;
  onSelectDay: (day: Date) => void;
  onNewMeeting?: (date: Date) => void;
  onEventDelete?: (eventId: string) => void;
}) {
  const today = new Date();

  return (
    <div className="relative z-10 bg-[#f4f0e5] p-3 md:p-5">
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-2xl border border-[#1a1813]/10 bg-[#1a1813]/10">
        {DAY_LABELS.map((day) => (
          <div key={day} className="hidden bg-[#ece8de] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground md:block">
            {day}
          </div>
        ))}
        {days.map((day) => {
          const events = eventsByDay.get(dayKey(day)) ?? [];
          const inMonth = day.getMonth() === cursor.getMonth();
          const isToday = sameDay(day, today);
          return (
            <div
              key={day.toISOString()}
              className={`col-span-7 min-h-[136px] bg-[#fbfaf6] p-3 md:col-span-1 md:min-h-[150px] ${
                inMonth ? "" : "opacity-45"
              }`}
            >
              <div className="mb-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onSelectDay(day)}
                  className={`grid h-9 w-9 place-items-center rounded-full text-sm transition-colors ${
                    isToday ? "bg-[#e11919] text-white" : "bg-[#f1eee6] hover:bg-[#1a1813] hover:text-[#f6f1e6]"
                  }`}
                >
                  {day.getDate()}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date(day);
                    d.setHours(9, 0, 0, 0);
                    onNewMeeting?.(d);
                  }}
                  className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-[#1a1813] hover:text-[#f6f1e6]"
                  aria-label="Criar evento"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-1.5">
                {events.slice(0, 3).map((event) => {
                  const style = styleFor(event.kind);
                  return (
                    <div key={event.id} className={`group flex items-center gap-2 rounded-xl border px-2 py-2 ${style.card}`}>
                      <span className={`h-2 w-2 flex-none rounded-full ${style.dot}`} />
                      <button type="button" onClick={() => onSelectDay(day)} className="min-w-0 flex-1 text-left">
                        <span className="block truncate text-xs">{event.title}</span>
                        <span className="block font-mono text-[9px] text-muted-foreground">{timeLabel(event.starts_at)}</span>
                      </button>
                      {onEventDelete && (
                        <button
                          type="button"
                          onClick={() => onEventDelete(event.id)}
                          className="hidden text-muted-foreground hover:text-destructive group-hover:block"
                          title="Apagar evento"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
                {events.length > 3 && (
                  <button type="button" onClick={() => onSelectDay(day)} className="text-xs text-muted-foreground">
                    +{events.length - 3} mais
                  </button>
                )}
                {events.length === 0 && (
                  <button
                    type="button"
                    onClick={() => onSelectDay(day)}
                    className="rounded-xl border border-dashed border-[#1a1813]/10 px-3 py-3 text-left text-xs text-muted-foreground transition-colors hover:bg-white"
                  >
                    Sem eventos
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
