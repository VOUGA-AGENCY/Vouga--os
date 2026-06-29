import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Ev = {
  id: string;
  title: string;
  kind: string;
  starts_at: string;
  ends_at: string | null;
  source_type: string | null;
};

function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = (x.getDay() + 6) % 7; // monday=0
  x.setDate(x.getDate() - day);
  return x;
}

function fmtDay(d: Date) {
  return d.toLocaleDateString("pt-PT", { weekday: "short", day: "2-digit" });
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isAllDay(ev: Ev) {
  if (!ev.ends_at) return false;
  const s = new Date(ev.starts_at);
  const e = new Date(ev.ends_at);
  return s.getHours() === 0 && s.getMinutes() === 0 && e.getHours() === 0 && e.getMinutes() === 0 && (e.getTime() - s.getTime()) >= 23 * 3600 * 1000;
}

export function WeeklyCalendar() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [anchor, setAnchor] = useState(() => startOfWeek(new Date()));
  const [picked, setPicked] = useState<Date | null>(null);

  const weekStart = anchor;
  const weekEnd = new Date(anchor);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const eventsQ = useQuery({
    queryKey: ["weekly-events", user?.id, weekStart.toISOString()],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("event_participants")
        .select("calendar_events(id,title,kind,starts_at,ends_at,source_type)")
        .eq("user_id", user!.id);
      const evs = (data ?? [])
        .map((r) => r.calendar_events as Ev | null)
        .filter((e): e is Ev => !!e)
        .filter((e) => {
          const t = new Date(e.starts_at).getTime();
          return t >= weekStart.getTime() && t < weekEnd.getTime();
        });
      return evs;
    },
  });

  const events = eventsQ.data ?? [];

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const today = new Date();

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground italic">
          Calendário individual. Só tu vês os eventos pessoais que crias aqui.
        </p>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { const d = new Date(anchor); d.setDate(d.getDate() - 7); setAnchor(d); }}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <button onClick={() => setAnchor(startOfWeek(new Date()))} className="text-xs text-muted-foreground hover:text-foreground px-2">
            Hoje
          </button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { const d = new Date(anchor); d.setDate(d.getDate() + 7); setAnchor(d); }}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px rounded-lg border border-border bg-border overflow-hidden">
        {days.map((d) => {
          const dayEvs = events
            .filter((e) => sameDay(new Date(e.starts_at), d))
            .sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at));
          const isToday = sameDay(d, today);
          return (
            <button
              key={d.toISOString()}
              onClick={() => setPicked(d)}
              className="group min-h-[140px] bg-card p-2 text-left transition-colors hover:bg-muted/40"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className={`text-[11px] uppercase tracking-wider ${isToday ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
                  {fmtDay(d)}
                </span>
                <span className="opacity-0 group-hover:opacity-100 text-[11px] text-muted-foreground">+</span>
              </div>
              <div className="space-y-1">
                {dayEvs.map((e) => {
                  const personal = e.source_type === "personal";
                  const allDay = isAllDay(e);
                  return (
                    <div
                      key={e.id}
                      className={`rounded px-1.5 py-1 text-[11px] leading-tight ${personal ? "bg-blue-100 text-blue-900" : "bg-purple-100 text-purple-900"}`}
                      title={e.title}
                    >
                      <p className="truncate font-medium">{e.title}</p>
                      <p className="text-[10px] opacity-70">
                        {allDay
                          ? "Dia todo"
                          : new Date(e.starts_at).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  );
                })}
              </div>
            </button>
          );
        })}
      </div>

      <NewPersonalEventDialog
        date={picked}
        onClose={() => setPicked(null)}
        onCreated={() => qc.invalidateQueries({ queryKey: ["weekly-events"] })}
      />
    </div>
  );
}

function NewPersonalEventDialog({
  date,
  onClose,
  onCreated,
}: {
  date: Date | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !title.trim() || !user) return;
    setBusy(true);
    const startsAt = new Date(date);
    const endsAt = new Date(date);
    if (allDay) {
      startsAt.setHours(0, 0, 0, 0);
      endsAt.setHours(0, 0, 0, 0);
      endsAt.setDate(endsAt.getDate() + 1);
    } else {
      const [sh, sm] = startTime.split(":").map(Number);
      const [eh, em] = endTime.split(":").map(Number);
      startsAt.setHours(sh, sm, 0, 0);
      endsAt.setHours(eh, em, 0, 0);
    }
    const { data: created, error } = await supabase
      .from("calendar_events")
      .insert({
        title: title.trim(),
        kind: "custom",
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        source_type: "personal",
        created_by: user.id,
      })
      .select("id")
      .single();
    if (!error && created) {
      await supabase.from("event_participants").insert({ event_id: created.id, user_id: user.id });
    }
    setBusy(false);
    setTitle("");
    setAllDay(false);
    setStartTime("09:00");
    setEndTime("10:00");
    onCreated();
    onClose();
  };

  return (
    <Dialog open={!!date} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Novo evento pessoal</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <p className="text-xs text-muted-foreground">
              {date?.toLocaleDateString("pt-PT", { weekday: "long", day: "2-digit", month: "long" })}
            </p>
            <div className="space-y-2">
              <Label htmlFor="ev-title">Nome</Label>
              <Input id="ev-title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus required />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={allDay} onCheckedChange={(v) => setAllDay(!!v)} />
              <span>Dia todo</span>
            </label>
            {!allDay && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="ev-start">Início</Label>
                  <Input id="ev-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ev-end">Fim</Label>
                  <Input id="ev-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                </div>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground italic">
              Este evento é apenas teu. Não fica visível para o resto da equipa.
            </p>
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={busy || !title.trim()}>Adicionar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
