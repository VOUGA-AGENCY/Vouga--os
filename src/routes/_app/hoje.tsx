import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarDays, Check, ListChecks, AlertTriangle, Flag, ArrowRight } from "lucide-react";
import { tasks as tasksApi, events as eventsApi, milestones as msApi, crm } from "@/lib/data";
import type { Task, CalEvent, Milestone, Empresa } from "@/lib/data";

export const Route = createFileRoute("/_app/hoje")({
  component: HojePage,
});

const PEOPLE = ["Miguel", "Roque", "Inês"];
const PERSON_COLOR: Record<string, string> = { Miguel: "#c97800", Roque: "#6e7a59", "Inês": "#4f8df5" };
const PRIORITY_RANK: Record<string, number> = { urgent: 0, important: 1, medium: 2, low: 3 };
const PRIORITY_DOT: Record<string, string> = {
  urgent: "#df4b35",
  important: "#df8b24",
  medium: "#42b976",
  low: "#6ba7d8",
};
const PRIORITY_LABEL: Record<string, string> = {
  urgent: "Urgente",
  important: "Importante",
  medium: "Médio",
  low: "Baixo",
};

const ACTIVE_STAGES = new Set(["alvo", "contactado", "em_conversa", "discovery", "proposta"]);

function getMe(): string {
  if (typeof window === "undefined") return PEOPLE[0];
  return localStorage.getItem("vouga.me") || PEOPLE[0];
}

function greeting(d: Date): string {
  const h = d.getHours();
  if (h < 5) return "Boa madrugada";
  if (h < 13) return "Bom dia";
  if (h < 20) return "Boa tarde";
  return "Boa noite";
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
}
function fmtDayShort(d: Date) {
  return d.toLocaleDateString("pt-PT", { weekday: "short", day: "2-digit", month: "short" });
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function HojePage() {
  const qc = useQueryClient();
  const now = new Date();
  const [me, setMe] = useState(getMe());
  const [agenda, setAgenda] = useState<"dia" | "semana">("dia");

  const start = startOfDay(now);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const startISO = start.toISOString();
  const endISO = end.toISOString();

  const tasksQ = useQuery({ queryKey: ["hoje-tasks"], queryFn: () => tasksApi.list() });
  const eventsQ = useQuery({ queryKey: ["hoje-events", startISO, endISO], queryFn: () => eventsApi.listRange(startISO, endISO) });
  const msQ = useQuery({ queryKey: ["hoje-ms"], queryFn: () => msApi.list() });
  const empresasQ = useQuery({ queryKey: ["hoje-empresas"], queryFn: () => crm.listEmpresas() });

  const myTasks = ((tasksQ.data ?? []) as Task[])
    .filter((t) => t.status !== "done" && (t.assignee ?? "") === me)
    .sort((a, b) => (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9));

  const allEvents = (eventsQ.data ?? []) as CalEvent[];
  const dayEvents = allEvents.filter((e) => sameDay(new Date(e.starts_at), now));
  const shownEvents = agenda === "dia" ? dayEvents : allEvents;

  // Próxima milestone (a partir de hoje, ainda não concluída)
  const nextMs = ((msQ.data ?? []) as Milestone[])
    .filter((m) => m.status !== "done" && m.target_date && new Date(m.target_date) >= start)
    .sort((a, b) => new Date(a.target_date!).getTime() - new Date(b.target_date!).getTime())[0];

  // Próximos passos comerciais em atraso ou para hoje
  const dueSteps = ((empresasQ.data ?? []) as Empresa[])
    .filter(
      (e) =>
        ACTIVE_STAGES.has(e.estagio) &&
        e.proximo_passo &&
        e.proximo_passo_data &&
        new Date(e.proximo_passo_data) <= end &&
        sameDayOrBefore(new Date(e.proximo_passo_data), now),
    )
    .sort((a, b) => new Date(a.proximo_passo_data!).getTime() - new Date(b.proximo_passo_data!).getTime())
    .slice(0, 4);

  const pickMe = (name: string) => {
    setMe(name);
    if (typeof window !== "undefined") localStorage.setItem("vouga.me", name);
  };
  const completeTask = async (id: string) => {
    await tasksApi.update(id, { status: "done" });
    qc.invalidateQueries({ queryKey: ["hoje-tasks"] });
  };

  const urgentCount = myTasks.filter((t) => t.priority === "urgent" || t.priority === "important").length;

  return (
    <div className="relative left-1/2 w-screen -translate-x-1/2 px-5 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[1100px] space-y-8">
        {/* Cabeçalho */}
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="vouga-label">{now.toLocaleDateString("pt-PT", { weekday: "long", day: "2-digit", month: "long" })}</p>
            <h1 className="mt-2 text-4xl tracking-tight sm:text-5xl">
              {greeting(now)}, {me.split(" ")[0]}.
            </h1>
          </div>
          {/* Quem sou eu */}
          <div className="flex items-center gap-2">
            <span className="vouga-label hidden sm:inline">Sou</span>
            <div className="flex gap-1 rounded-full bg-[var(--muted)] p-1">
              {PEOPLE.map((p) => (
                <button
                  key={p}
                  onClick={() => pickMe(p)}
                  className="rounded-full px-3 py-1 text-sm transition-colors"
                  style={
                    me === p
                      ? { background: PERSON_COLOR[p], color: "#fff" }
                      : { color: "var(--muted-foreground)" }
                  }
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          {/* As minhas tarefas */}
          <section className="glass rounded-3xl p-6 sm:p-7">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ListChecks className="h-5 w-5 text-[var(--ring)]" />
                <h2 className="text-2xl">As minhas tarefas</h2>
              </div>
              <span className="font-mono text-sm text-muted-foreground">
                {myTasks.length} aberta{myTasks.length === 1 ? "" : "s"}
                {urgentCount > 0 && <span className="text-[var(--ring)]"> · {urgentCount} a arder</span>}
              </span>
            </div>

            {tasksQ.isLoading ? (
              <p className="text-sm text-muted-foreground">A carregar…</p>
            ) : myTasks.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <Check className="h-8 w-8 text-[var(--success)]" />
                <p className="text-base">Sem tarefas abertas. Aproveita o café.</p>
              </div>
            ) : (
              <ul className="space-y-1">
                {myTasks.map((t) => (
                  <li
                    key={t.id}
                    className="glass-tile group flex items-center gap-3 rounded-2xl px-3 py-2.5 hover:bg-white/45"
                  >
                    <button
                      onClick={() => completeTask(t.id)}
                      title="Marcar como feito"
                      className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-[#1a1813]/25 text-transparent transition-colors hover:border-[var(--success)] hover:bg-[var(--success)] hover:text-white"
                    >
                      <Check className="h-3 w-3" />
                    </button>
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: PRIORITY_DOT[t.priority] ?? "#999" }}
                      title={PRIORITY_LABEL[t.priority] ?? t.priority}
                    />
                    <span className="flex-1 text-[15px] leading-snug">{t.title}</span>
                  </li>
                ))}
              </ul>
            )}

            <Link
              to="/engineers"
              className="mt-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Ver todo o trabalho <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </section>

          {/* Coluna direita */}
          <div className="space-y-5">
            {/* Agenda */}
            <section className="glass rounded-3xl p-6 sm:p-7">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CalendarDays className="h-5 w-5 text-[var(--ring)]" />
                  <h2 className="text-2xl">Agenda</h2>
                </div>
                <div className="flex gap-1 rounded-full bg-[var(--muted)] p-1 text-xs">
                  {(["dia", "semana"] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => setAgenda(v)}
                      className="rounded-full px-2.5 py-1 capitalize transition-colors"
                      style={agenda === v ? { background: "var(--foreground)", color: "var(--background)" } : { color: "var(--muted-foreground)" }}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {eventsQ.isLoading ? (
                <p className="text-sm text-muted-foreground">A carregar…</p>
              ) : shownEvents.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  {agenda === "dia" ? "Nada na agenda hoje." : "Semana livre."}
                </p>
              ) : agenda === "dia" ? (
                <ul className="space-y-2">
                  {shownEvents.map((e) => (
                    <li key={e.id} className="flex items-baseline gap-3">
                      <span className="w-12 shrink-0 font-mono text-sm text-[var(--ring)]">{fmtTime(e.starts_at)}</span>
                      <span className="text-[15px] leading-snug">{e.title}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <WeekGroups events={shownEvents} />
              )}

              <Link
                to="/calendario"
                className="mt-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Abrir calendário <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </section>

            {/* A não esquecer */}
            <section className="glass rounded-3xl p-6 sm:p-7">
              <div className="mb-4 flex items-center gap-2.5">
                <AlertTriangle className="h-5 w-5 text-[var(--ring)]" />
                <h2 className="text-2xl">A não esquecer</h2>
              </div>

              {dueSteps.length === 0 && !nextMs ? (
                <p className="py-2 text-sm text-muted-foreground">Nada urgente. Tudo em dia.</p>
              ) : (
                <div className="space-y-4">
                  {dueSteps.length > 0 && (
                    <div>
                      <p className="vouga-label mb-2">Próximos passos comerciais</p>
                      <ul className="space-y-2">
                        {dueSteps.map((e) => {
                          const late = new Date(e.proximo_passo_data!) < startOfDay(now);
                          return (
                            <li key={e.id} className="flex items-start gap-2">
                              <span
                                className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                                style={{ background: late ? "#df4b35" : "var(--ring)" }}
                              />
                              <span className="text-sm leading-snug">
                                <span className="font-medium">{e.nome}</span>
                                <span className="text-muted-foreground"> — {e.proximo_passo}</span>
                                {late && <span className="text-[#df4b35]"> (em atraso)</span>}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  {nextMs && (
                    <div className="flex items-start gap-2.5 border-t border-[var(--border)] pt-4">
                      <Flag className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ring)]" />
                      <div>
                        <p className="vouga-label mb-0.5">Próxima milestone</p>
                        <p className="text-sm leading-snug">{nextMs.title}</p>
                        {nextMs.target_date && (
                          <p className="font-mono text-xs text-muted-foreground">
                            {new Date(nextMs.target_date).toLocaleDateString("pt-PT", { day: "2-digit", month: "long" })}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function sameDayOrBefore(a: Date, b: Date) {
  const sa = startOfDay(a).getTime();
  const sb = startOfDay(b).getTime();
  return sa <= sb + 6 * 86400000; // dentro da próxima semana ou em atraso
}

function WeekGroups({ events }: { events: CalEvent[] }) {
  const byDay = new Map<string, CalEvent[]>();
  for (const e of events) {
    const d = new Date(e.starts_at);
    const key = startOfDay(d).toISOString();
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(e);
  }
  const keys = Array.from(byDay.keys()).sort();
  return (
    <div className="space-y-3">
      {keys.map((k) => (
        <div key={k}>
          <p className="vouga-label mb-1.5">{fmtDayShort(new Date(k))}</p>
          <ul className="space-y-1.5">
            {byDay.get(k)!.map((e) => (
              <li key={e.id} className="flex items-baseline gap-3">
                <span className="w-12 shrink-0 font-mono text-sm text-[var(--ring)]">{fmtTime(e.starts_at)}</span>
                <span className="text-[15px] leading-snug">{e.title}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
