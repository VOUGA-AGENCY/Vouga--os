import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RichEditor } from "@/components/RichEditor";
import { toast } from "sonner";
import { Trash2, Upload, Download, FileText, Plus, Search, CalendarDays } from "lucide-react";
import { tasks as tasksApi, sprints as sprintsApi, milestones as msApi, documents as docsApi, resources as resApi, type Doc, type Task, type Sprint } from "@/lib/data";

export const Route = createFileRoute("/_app/engineers")({
  component: TrabalhoPage,
});

const PRIORITY = [
  { v: "urgent", l: "Urgente" },
  { v: "important", l: "Importante" },
  { v: "medium", l: "Médio" },
  { v: "low", l: "Baixo" },
];
const PRIORITY_STYLE: Record<string, { label: string; rail: string; cell: string }> = {
  urgent: { label: "Urgente", rail: "bg-[#df4b35]", cell: "bg-[#f06d57] text-white" },
  important: { label: "Importante", rail: "bg-[#df8b24]", cell: "bg-[#f3a83a] text-[#3b2608]" },
  medium: { label: "Médio", rail: "bg-[#42b976]", cell: "bg-[#47c77e] text-[#113d26]" },
  low: { label: "Baixo", rail: "bg-[#6ba7d8]", cell: "bg-[#65a7e8] text-white" },
};
const STATUS = [
  { v: "todo", l: "Backlog" },
  { v: "doing", l: "Em curso" },
  { v: "blocked", l: "Bloqueado" },
  { v: "done", l: "Feito" },
];
const STATUS_STYLE: Record<string, { label: string; cell: string }> = {
  todo: { label: "Backlog", cell: "bg-[#ebe7dc] text-[#4f4a41]" },
  doing: { label: "Em curso", cell: "bg-[#4f8df5] text-white" },
  blocked: { label: "Bloqueado", cell: "bg-[#e86a5c] text-white" },
  done: { label: "Feito", cell: "bg-[#42c777] text-[#10371f]" },
};
const ASSIGNEES = ["Miguel", "Roque", "Inês"];
const ASSIGNEE_COLOR: Record<string, string> = { Miguel: "#c97800", Roque: "#6e7a59", "Inês": "#4f8df5" };

const COLS = "grid-cols-[6px_minmax(260px,1.7fr)_120px_148px_136px_96px_60px]";

function fmtRange(a: string, b: string) {
  const o: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" };
  return `${new Date(a).toLocaleDateString("pt-PT", o)} – ${new Date(b).toLocaleDateString("pt-PT", o)}`;
}
function isCurrent(s: Sprint) {
  const t = Date.now();
  return new Date(s.starts_on).getTime() <= t && t <= new Date(s.ends_on).getTime() + 86400000;
}
function Avatar({ name, size = 26 }: { name: string | null; size?: number }) {
  if (!name) return <span className="grid place-items-center rounded-full border border-dashed border-[#1a1813]/25 text-[10px] text-muted-foreground" style={{ width: size, height: size }}>?</span>;
  return (
    <span className="grid place-items-center rounded-full font-mono text-[11px] text-white" style={{ width: size, height: size, background: ASSIGNEE_COLOR[name] ?? "#8a857a" }}>
      {name[0].toUpperCase()}
    </span>
  );
}

function TrabalhoPage() {
  return (
    <div className="relative left-1/2 w-screen -translate-x-1/2 px-5 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[1480px] space-y-8">
        <header>
          <p className="vouga-label">Trabalho</p>
          <h1 className="mt-3 text-4xl tracking-tight sm:text-5xl">O que há para fazer.</h1>
        </header>

        <Tabs defaultValue="backlog">
          <TabsList className="max-w-full overflow-x-auto">
            <TabsTrigger value="backlog">Backlog</TabsTrigger>
            <TabsTrigger value="roadmap">Roadmap</TabsTrigger>
            <TabsTrigger value="docs">Docs e resources</TabsTrigger>
          </TabsList>
          <TabsContent value="backlog" className="mt-6"><Backlog /></TabsContent>
          <TabsContent value="roadmap" className="mt-6"><Roadmap /></TabsContent>
          <TabsContent value="docs" className="mt-6"><DocsResources /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function Backlog() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [newSprint, setNewSprint] = useState(false);

  const tasksQ = useQuery({ queryKey: ["proj-tasks"], queryFn: () => tasksApi.list() });
  const sprintsQ = useQuery({ queryKey: ["sprints"], queryFn: () => sprintsApi.list() });
  const all = tasksQ.data ?? [];
  const sprints = sprintsQ.data ?? [];
  const current = all.find((t) => t.id === selected) ?? null;
  const refresh = () => { qc.invalidateQueries({ queryKey: ["proj-tasks"] }); qc.invalidateQueries({ queryKey: ["sprints"] }); };

  const filtered = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return f ? all.filter((t) => t.title.toLowerCase().includes(f)) : all;
  }, [all, filter]);

  const groups = useMemo(() => {
    const g = sprints.map((s) => ({ key: s.id, label: s.name, sub: fmtRange(s.starts_on, s.ends_on), sprintId: s.id as string | null, tasks: filtered.filter((t) => t.sprint_id === s.id) }));
    g.push({ key: "backlog", label: "Backlog", sub: "sem sprint", sprintId: null, tasks: filtered.filter((t) => !t.sprint_id) });
    return g;
  }, [filtered, sprints]);

  const patch = async (id: string, p: Partial<Task>) => { await tasksApi.update(id, p); refresh(); };
  const toggle = (t: Task) => patch(t.id, { status: t.status === "done" ? "todo" : "done" });
  const remove = async (id: string) => { await tasksApi.remove(id); if (selected === id) setSelected(null); refresh(); };
  const quickAdd = async (title: string, sprintId: string | null) => { await tasksApi.create(title, { sprint_id: sprintId }); refresh(); };

  return (
    <div className="space-y-10">
      <SprintOverview sprints={sprints} tasks={all} onNew={() => setNewSprint(true)} />

      {/* barra do backlog */}
      <div className="flex flex-col gap-4 border-t border-[#1a1813]/10 pt-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-3xl leading-none tracking-tight text-[#1a1813] sm:text-4xl">Feature Backlog</h2>
          <p className="mt-2 text-sm text-muted-foreground">Todas as tarefas, por sprint. Clica numa para abrir o detalhe.</p>
        </div>
        <div className="flex w-full max-w-md items-center gap-2 rounded-full border border-[#1a1813]/10 bg-white/70 px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filtrar tarefas..." className="h-7 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0" />
        </div>
      </div>

      {groups.map((grp) => (
        <GroupTable
          key={grp.key}
          label={grp.label}
          sub={grp.sub}
          tasks={grp.tasks}
          onToggle={toggle}
          onSelect={setSelected}
          onPatch={patch}
          onDelete={remove}
          onQuickAdd={(title) => quickAdd(title, grp.sprintId)}
        />
      ))}

      <TaskDetail task={current} sprints={sprints} onClose={() => setSelected(null)} onSaved={refresh} />
      <NewSprintDialog open={newSprint} onClose={() => setNewSprint(false)} onSaved={refresh} />
    </div>
  );
}

function SprintOverview({ sprints, tasks, onNew }: { sprints: Sprint[]; tasks: Task[]; onNew: () => void }) {
  const sorted = sprints;
  let currentIdx = sorted.findIndex(isCurrent);
  if (currentIdx === -1) currentIdx = sorted.findIndex((s) => new Date(s.ends_on).getTime() >= Date.now());
  if (currentIdx === -1) currentIdx = 0;
  const cur = sorted[currentIdx];
  const next = sorted[currentIdx + 1];

  const card = (s: Sprint | undefined, tag: string) => {
    if (!s) {
      return (
        <button onClick={onNew} className="flex min-h-[150px] flex-col items-start justify-center rounded-2xl border border-dashed border-[#1a1813]/20 p-6 text-left transition-colors hover:border-[var(--ring)] hover:bg-white/40">
          <Plus className="h-5 w-5 text-[var(--ring)]" />
          <p className="mt-3 text-sm text-muted-foreground">Criar {tag.toLowerCase()}</p>
        </button>
      );
    }
    const ts = tasks.filter((t) => t.sprint_id === s.id);
    const done = ts.filter((t) => t.status === "done").length;
    const effort = ts.reduce((a, t) => a + (t.effort ?? 0), 0);
    const pct = ts.length ? (done / ts.length) * 100 : 0;
    return (
      <div className="rounded-2xl border border-[#1a1813]/10 bg-[#fbfaf6] p-6">
        <div className="flex items-baseline justify-between">
          <p className="vouga-label">{tag}</p>
          <span className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" />{fmtRange(s.starts_on, s.ends_on)}</span>
        </div>
        <h3 className="mt-2 font-serif text-3xl tracking-tight">{s.name}</h3>
        <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
          <span><b className="text-foreground">{ts.length}</b> tarefas</span>
          <span><b className="text-foreground">{done}</b> feitas</span>
          {effort > 0 && <span><b className="text-foreground">{effort}</b> sem</span>}
        </div>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#1a1813]/8">
          <div className="h-full rounded-full bg-[var(--ring)]" style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  };

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-serif text-2xl tracking-tight">Sprints</h2>
        <Button variant="outline" size="sm" onClick={onNew} className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Nova sprint</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {card(cur, "Esta sprint")}
        {card(next, "Próxima sprint")}
      </div>
    </section>
  );
}

function GroupTable({
  label, sub, tasks, onToggle, onSelect, onPatch, onDelete, onQuickAdd,
}: {
  label: string; sub: string; tasks: Task[];
  onToggle: (t: Task) => void; onSelect: (id: string) => void;
  onPatch: (id: string, p: Partial<Task>) => void;
  onDelete: (id: string) => void;
  onQuickAdd: (title: string) => void;
}) {
  const [adding, setAdding] = useState("");
  const sorted = [...tasks].sort((a, b) => Number(a.status === "done") - Number(b.status === "done"));
  const effort = tasks.reduce((a, t) => a + (t.effort ?? 0), 0);

  return (
    <section>
      <div className="mb-3 flex items-baseline gap-3">
        <h3 className="text-xl tracking-tight text-[#1a1813]">{label}</h3>
        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{sub}</span>
        <span className="ml-auto font-mono text-[11px] text-muted-foreground">{tasks.length} tarefas{effort > 0 ? ` · ${effort} sem` : ""}</span>
      </div>
      <div className="overflow-x-auto rounded-[6px] border border-[#1a1813]/10 bg-white/55">
        <div className="min-w-[920px]">
          <div className={`grid ${COLS} items-center border-b border-[#1a1813]/10 bg-[#f7f4ec] text-[11px] uppercase tracking-wider text-muted-foreground`}>
            <div />
            <div className="px-4 py-2.5">Tarefa</div>
            <div className="px-2 py-2.5 text-center">Responsável</div>
            <div className="px-2 py-2.5 text-center">Estado</div>
            <div className="px-2 py-2.5 text-center">Prioridade</div>
            <div className="px-2 py-2.5 text-center">Esforço</div>
            <div className="px-2 py-2.5" />
          </div>
          {sorted.map((t) => (
            <TaskRow key={t.id} task={t} onToggle={() => onToggle(t)} onOpen={() => onSelect(t.id)} onPatch={(p) => onPatch(t.id, p)} onDelete={() => onDelete(t.id)} />
          ))}
          <div className={`grid ${COLS} items-center border-t border-[#1a1813]/8`}>
            <div className="bg-[#1a1813]/10" />
            <div className="px-4 py-2">
              <input
                value={adding}
                onChange={(e) => setAdding(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && adding.trim()) {
                    onQuickAdd(adding.trim());
                    setAdding("");
                  }
                }}
                placeholder="+ Nova tarefa"
                className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
            <div className="col-span-5" />
          </div>
        </div>
      </div>
    </section>
  );
}

function TaskRow({ task, onToggle, onOpen, onPatch, onDelete }: { task: Task; onToggle: () => void; onOpen: () => void; onPatch: (p: Partial<Task>) => void; onDelete: () => void }) {
  const priority = PRIORITY_STYLE[task.priority] ?? PRIORITY_STYLE.medium;
  const status = STATUS_STYLE[task.status] ?? STATUS_STYLE.todo;
  const [effort, setEffort] = useState(task.effort?.toString() ?? "");
  useEffect(() => setEffort(task.effort?.toString() ?? ""), [task.effort]);

  return (
    <div className={`group grid ${COLS} items-stretch border-b border-white/85 last:border-b-0`}>
      <div className={priority.rail} />
      <div className="flex items-center bg-[#efeee9] px-4 py-2.5">
        <button onClick={onOpen} className={`min-w-0 flex-1 truncate text-left text-sm font-medium ${task.status === "done" ? "text-muted-foreground line-through" : "text-[#24415f]"}`}>{task.title}</button>
      </div>

      {/* responsável */}
      <div className="grid place-items-center bg-[#efeee9] px-2 py-2">
        <Select value={task.assignee ?? "none"} onValueChange={(v) => onPatch({ assignee: v === "none" ? null : v })}>
          <SelectTrigger className="h-9 w-9 justify-center rounded-full border-0 bg-transparent p-0 [&>svg]:hidden">
            <Avatar name={task.assignee} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none" className="text-xs">Sem responsável</SelectItem>
            {ASSIGNEES.map((a) => <SelectItem key={a} value={a} className="text-xs">{a}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* estado */}
      <div className="grid place-items-stretch px-0 py-0">
        <Select value={task.status} onValueChange={(v) => onPatch({ status: v })}>
          <SelectTrigger className={`h-full justify-center rounded-none border-0 text-xs font-medium [&>svg]:hidden ${status.cell}`}>
            {status.label}
          </SelectTrigger>
          <SelectContent>{STATUS.map((s) => <SelectItem key={s.v} value={s.v} className="text-xs">{s.l}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {/* prioridade */}
      <div className="grid place-items-stretch px-0 py-0">
        <Select value={task.priority} onValueChange={(v) => onPatch({ priority: v })}>
          <SelectTrigger className={`h-full justify-center rounded-none border-0 text-xs font-medium [&>svg]:hidden ${priority.cell}`}>
            {priority.label}
          </SelectTrigger>
          <SelectContent>{PRIORITY.map((p) => <SelectItem key={p.v} value={p.v} className="text-xs">{p.l}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {/* esforço */}
      <div className="flex items-center justify-center gap-1 bg-[#efeee9] px-2 py-2">
        <input
          value={effort}
          onChange={(e) => setEffort(e.target.value.replace(/[^0-9]/g, ""))}
          onBlur={() => { const n = effort === "" ? null : parseInt(effort, 10); if (n !== task.effort) onPatch({ effort: n }); }}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          placeholder="—"
          className="w-8 bg-transparent text-center text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
        {effort !== "" && <span className="text-[11px] text-muted-foreground">sem</span>}
      </div>

      {/* ações */}
      <div className="flex items-center justify-center bg-[#efeee9] px-2 py-2">
        <button onClick={onDelete} className="rounded-full p-2 text-muted-foreground opacity-40 transition-all hover:bg-red-50 hover:text-destructive group-hover:opacity-100"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );
}

function TaskDetail({ task, sprints, onClose, onSaved }: { task: Task | null; sprints: Sprint[]; onClose: () => void; onSaved: () => void }) {
  const [notes, setNotes] = useState("");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const hydrated = useRef(false);
  const last = useRef("");
  useEffect(() => { setNotes(task?.notes ?? ""); last.current = task?.notes ?? ""; hydrated.current = true; setSavedAt(null); }, [task?.id]);
  useEffect(() => {
    if (!task || !hydrated.current || notes === last.current) return;
    const t = setTimeout(async () => { await tasksApi.update(task.id, { notes }); last.current = notes; setSavedAt(new Date()); onSaved(); }, 700);
    return () => clearTimeout(t);
  }, [notes, task, onSaved]);

  const patch = async (p: Partial<Task>) => { if (task) { await tasksApi.update(task.id, p); onSaved(); } };

  return (
    <Sheet open={!!task} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {task && (
          <>
            <SheetHeader><SheetTitle className="text-2xl">{task.title}</SheetTitle></SheetHeader>
            <div className="mt-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Estado">
                  <Select value={task.status} onValueChange={(v) => patch({ status: v })}>
                    <SelectTrigger className="h-9 text-sm">{STATUS_STYLE[task.status]?.label ?? task.status}</SelectTrigger>
                    <SelectContent>{STATUS.map((s) => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Prioridade">
                  <Select value={task.priority} onValueChange={(v) => patch({ priority: v })}>
                    <SelectTrigger className="h-9 text-sm">{PRIORITY_STYLE[task.priority]?.label ?? task.priority}</SelectTrigger>
                    <SelectContent>{PRIORITY.map((p) => <SelectItem key={p.v} value={p.v}>{p.l}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Responsável">
                  <Select value={task.assignee ?? "none"} onValueChange={(v) => patch({ assignee: v === "none" ? null : v })}>
                    <SelectTrigger className="h-9 text-sm">{task.assignee ?? "Sem responsável"}</SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem responsável</SelectItem>
                      {ASSIGNEES.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Sprint">
                  <Select value={task.sprint_id ?? "none"} onValueChange={(v) => patch({ sprint_id: v === "none" ? null : v })}>
                    <SelectTrigger className="h-9 text-sm">{sprints.find((s) => s.id === task.sprint_id)?.name ?? "Backlog"}</SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Backlog (sem sprint)</SelectItem>
                      {sprints.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <div>
                <p className="vouga-label mb-2">Notas</p>
                <RichEditor value={notes} onChange={setNotes} placeholder="Escreve aqui o que precisares para esta tarefa…" minHeight={300} />
                <p className="mt-2 text-[11px] uppercase tracking-widest text-muted-foreground">{savedAt ? `Guardado às ${savedAt.toLocaleTimeString("pt-PT")}` : "Edição automática"}</p>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function NewSprintDialog({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const reset = () => { setName(""); setStart(""); setEnd(""); };
  const submit = async () => {
    if (!name.trim() || !start || !end) return toast.error("Falta nome ou datas.");
    try { await sprintsApi.create({ name: name.trim(), starts_on: start, ends_on: end }); } catch (e) { return toast.error((e as Error).message); }
    reset(); onClose(); onSaved();
  };
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Nova sprint</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2"><p className="vouga-label">Nome</p><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Sprint 3" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><p className="vouga-label">Início</p><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
            <div className="space-y-2"><p className="vouga-label">Fim</p><Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => { reset(); onClose(); }}>Cancelar</Button>
          <Button onClick={submit}>Criar sprint</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><p className="vouga-label">{label}</p>{children}</div>;
}

function Roadmap() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const q = useQuery({ queryKey: ["proj-milestones"], queryFn: () => msApi.list() });
  const list = q.data ?? [];
  const refresh = () => qc.invalidateQueries({ queryKey: ["proj-milestones"] });

  const add = async () => {
    if (!title.trim()) return toast.error("Falta o nome do milestone.");
    await msApi.create({ title: title.trim(), target_date: date || null });
    setTitle(""); setDate("");
    refresh();
  };

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-4">
      <div className="flex flex-wrap gap-2">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Novo milestone…" className="min-w-40 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0" />
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" />
        <Button onClick={add} size="sm" className="shrink-0">Adicionar</Button>
      </div>
      <ul className="mt-2 divide-y divide-border">
        {list.map((m) => (
          <li key={m.id} className="group flex items-center gap-3 py-3">
            <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--ring)]" />
            <span className="flex-1 text-sm">{m.title}</span>
            {m.target_date && <span className="font-mono text-[11px] text-muted-foreground">{new Date(m.target_date).toLocaleDateString("pt-PT")}</span>}
            <button onClick={async () => { await msApi.remove(m.id); refresh(); }} className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
        {list.length === 0 && <li className="py-4 text-sm text-muted-foreground">Sem milestones.</li>}
      </ul>
    </div>
  );
}

function DocsResources() {
  const qc = useQueryClient();
  const [docTitle, setDocTitle] = useState("");
  const [openDoc, setOpenDoc] = useState<string | null>(null);

  const docsQ = useQuery({ queryKey: ["proj-docs"], queryFn: () => docsApi.list() });
  const resQ = useQuery({ queryKey: ["proj-resources"], queryFn: () => resApi.list() });
  const docs = docsQ.data ?? [];
  const res = resQ.data ?? [];
  const current = docs.find((d) => d.id === openDoc) ?? null;

  const createDoc = async () => {
    if (!docTitle.trim()) return;
    const id = await docsApi.create(docTitle.trim());
    setDocTitle("");
    qc.invalidateQueries({ queryKey: ["proj-docs"] });
    setOpenDoc(id);
  };
  const upload = async (file: File) => {
    try { await resApi.upload(file); qc.invalidateQueries({ queryKey: ["proj-resources"] }); toast.success("Ficheiro enviado."); }
    catch (e) { toast.error((e as Error).message); }
  };
  const download = async (path: string, name: string) => {
    const url = await resApi.signedUrl(path);
    if (url) { const a = document.createElement("a"); a.href = url; a.download = name; a.click(); }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-2xl border border-border bg-card/60 p-4">
        <h3 className="vouga-label mb-3">Documentos</h3>
        <div className="flex gap-2">
          <Input value={docTitle} onChange={(e) => setDocTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createDoc()} placeholder="Novo documento…" className="border-0 bg-transparent shadow-none focus-visible:ring-0" />
          <Button onClick={createDoc} size="sm" className="shrink-0 gap-1"><Plus className="h-3.5 w-3.5" /> Criar</Button>
        </div>
        <ul className="mt-2 divide-y divide-border">
          {docs.map((d) => (
            <li key={d.id} className="group flex items-center gap-3 py-2.5">
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <button onClick={() => setOpenDoc(d.id)} className="flex-1 text-left text-sm hover:underline">{d.title}</button>
              <button onClick={async () => { await docsApi.remove(d.id); qc.invalidateQueries({ queryKey: ["proj-docs"] }); }} className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
          {docs.length === 0 && <li className="py-4 text-sm text-muted-foreground">Sem documentos.</li>}
        </ul>
      </div>

      <div className="rounded-2xl border border-border bg-card/60 p-4">
        <h3 className="vouga-label mb-3">Recursos</h3>
        <label className="flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs hover:bg-accent">
          <Upload className="h-3.5 w-3.5" /> Enviar ficheiro
          <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </label>
        <ul className="mt-3 divide-y divide-border">
          {res.map((r) => (
            <li key={r.id} className="group flex items-center gap-3 py-2.5">
              <span className="flex-1 truncate text-sm">{r.name}</span>
              <span className="text-[11px] text-muted-foreground">{r.size ? `${Math.round(r.size / 1024)} KB` : ""}</span>
              <button onClick={() => download(r.path, r.name)} className="text-muted-foreground hover:text-foreground"><Download className="h-3.5 w-3.5" /></button>
              <button onClick={async () => { await resApi.remove(r.id, r.path); qc.invalidateQueries({ queryKey: ["proj-resources"] }); }} className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"><Trash2 className="h-3.5 w-3.5" /></button>
            </li>
          ))}
          {res.length === 0 && <li className="py-4 text-sm text-muted-foreground">Sem ficheiros.</li>}
        </ul>
      </div>

      <DocSheet doc={current} onClose={() => setOpenDoc(null)} onSaved={() => qc.invalidateQueries({ queryKey: ["proj-docs"] })} />
    </div>
  );
}

function DocSheet({ doc, onClose, onSaved }: { doc: Doc | null; onClose: () => void; onSaved: () => void }) {
  const [content, setContent] = useState("");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const hydrated = useRef(false);
  const last = useRef("");
  useEffect(() => { setContent(doc?.content ?? ""); last.current = doc?.content ?? ""; hydrated.current = true; setSavedAt(null); }, [doc?.id]);
  useEffect(() => {
    if (!doc || !hydrated.current || content === last.current) return;
    const t = setTimeout(async () => { await docsApi.update(doc.id, { content }); last.current = content; setSavedAt(new Date()); onSaved(); }, 700);
    return () => clearTimeout(t);
  }, [content, doc, onSaved]);

  return (
    <Sheet open={!!doc} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        {doc && (
          <>
            <SheetHeader><SheetTitle className="text-2xl">{doc.title}</SheetTitle></SheetHeader>
            <div className="mt-6">
              <RichEditor value={content} onChange={setContent} placeholder="Escreve o documento…" minHeight={420} />
              <p className="mt-2 text-[11px] uppercase tracking-widest text-muted-foreground">{savedAt ? `Guardado às ${savedAt.toLocaleTimeString("pt-PT")}` : "Edição automática"}</p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
