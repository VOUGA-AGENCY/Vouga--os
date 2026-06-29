import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type ComponentType, type CSSProperties, type DragEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  ArrowRight,
  GripVertical,
  Mail,
  MapPin,
  MessageSquarePlus,
  Phone,
  Plus,
  Search,
  Trophy,
  UserPlus,
} from "lucide-react";
import { crm } from "@/lib/data";
import type { Atividade, Contacto, Empresa, EmpresaEstagio, EmpresaVertical } from "@/lib/data";

export const Route = createFileRoute("/_app/pipeline")({
  validateSearch: (s: Record<string, unknown>) => ({
    empresa: typeof s.empresa === "string" ? s.empresa : undefined,
  }),
  component: CrmPage,
});

const PIPELINE_STAGES: { v: EmpresaEstagio; l: string; hint: string }[] = [
  { v: "alvo", l: "Alvo", hint: "Empresa identificada, sem toque ainda. Sai quando há 1º contacto enviado." },
  { v: "contactado", l: "Contactado", hint: "Pelo menos 1 toque, à espera. Sai quando respondem." },
  { v: "em_conversa", l: "Em conversa", hint: "Diálogo vivo. Sai quando há reunião de discovery marcada." },
  { v: "discovery", l: "Discovery", hint: "Reunião agendada ou feita. Sai quando há dor registada e mandato para propor." },
  { v: "proposta", l: "Proposta", hint: "Sprint proposto, à espera de decisão. Sai quando aceitam." },
  { v: "ganho", l: "Ganho", hint: "Sprint pago fechado." },
];

const EXIT_STAGES: { v: EmpresaEstagio; l: string; hint: string }[] = [
  { v: "perdido", l: "Perdido", hint: "Sempre com motivo registado." },
  { v: "adormecido", l: "Adormecido", hint: "Sem timing, mas com motivo registado." },
];

const ALL_STAGES = [...PIPELINE_STAGES, ...EXIT_STAGES];

const VERTICALS: { v: EmpresaVertical; l: string }[] = [
  { v: "quote", l: "Quote" },
  { v: "maintenance", l: "Maintenance" },
  { v: "quality", l: "Quality" },
];
const VERTICAL_LABEL = Object.fromEntries(VERTICALS.map((v) => [v.v, v.l])) as Record<EmpresaVertical, string>;

const RESPONSAVEIS = ["Miguel", "Roque", "Inês"];
const ORIGENS = ["Rede", "Outbound", "LinkedIn", "Evento", "Referência"];

const ACTION_TYPES: { v: Atividade["tipo"]; l: string }[] = [
  { v: "email", l: "Email" },
  { v: "linkedin", l: "LinkedIn" },
  { v: "chamada", l: "Chamada" },
  { v: "cafe", l: "Café" },
  { v: "visita", l: "Visita" },
  { v: "reuniao", l: "Reunião" },
];
const ACTION_LABEL = Object.fromEntries(ACTION_TYPES.map((a) => [a.v, a.l])) as Record<Atividade["tipo"], string>;

const RESULTADOS: { v: Atividade["resultado"]; l: string }[] = [
  { v: "sem_resposta", l: "Sem resposta" },
  { v: "respondeu", l: "Respondeu" },
  { v: "reuniao_marcada", l: "Reunião marcada" },
];
const RESULTADO_LABEL = Object.fromEntries(RESULTADOS.map((r) => [r.v, r.l])) as Record<Atividade["resultado"], string>;

const STAGE_COLOR: Record<EmpresaEstagio, string> = {
  alvo: "#a8a294",
  contactado: "#6ba7d8",
  em_conversa: "#4f8df5",
  discovery: "#7c5cff",
  proposta: "#df8b24",
  ganho: "#42b976",
  perdido: "#df4b35",
  adormecido: "#8a857a",
};
// Probabilidade de fecho por estágio, para o pipeline ponderado.
const STAGE_PROB: Record<EmpresaEstagio, number> = {
  alvo: 0.05,
  contactado: 0.1,
  em_conversa: 0.25,
  discovery: 0.45,
  proposta: 0.7,
  ganho: 1,
  perdido: 0,
  adormecido: 0,
};

const eur = (n: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n || 0);
const sumValor = (list: Empresa[]) => list.reduce((acc, e) => acc + (e.valor_estimado ?? 0), 0);

function CrmPage() {
  const qc = useQueryClient();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [creating, setCreating] = useState(false);

  const empresasQ = useQuery({ queryKey: ["crm-empresas"], queryFn: () => crm.listEmpresas() });
  const empresas = empresasQ.data ?? [];
  const selected = empresas.find((empresa) => empresa.id === search.empresa) ?? null;
  const open = (id: string) => navigate({ search: { empresa: id } });
  const close = () => navigate({ search: { empresa: undefined } });

  const updateEmpresa = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Empresa> }) => crm.updateEmpresa(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-empresas"] }),
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="relative left-1/2 w-screen -translate-x-1/2 px-4 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-[1580px] space-y-8">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="vouga-label">CRM</p>
            <h1 className="mt-3 text-4xl tracking-tight md:text-6xl">Pipeline comercial.</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Venda baseada em atividade: toda a empresa ativa precisa de próximo passo com data.
            </p>
          </div>
          <Button onClick={() => setCreating(true)} className="w-fit gap-2 rounded-full px-5">
            <Plus className="h-4 w-4" /> Nova empresa
          </Button>
        </header>

        <Tabs defaultValue="pipeline">
          <TabsList className="bg-[#e7e2d6]">
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
            <TabsTrigger value="empresas">Empresas</TabsTrigger>
          </TabsList>

          <TabsContent value="pipeline" className="mt-6">
            <PipelineBoard
              empresas={empresas}
              loading={empresasQ.isLoading}
              onOpen={open}
              onMove={(id, estagio) => updateEmpresa.mutate({ id, patch: { estagio } })}
            />
          </TabsContent>

          <TabsContent value="empresas" className="mt-6">
            <EmpresasTable
              empresas={empresas}
              onOpen={open}
              onPatch={(id, patch) => updateEmpresa.mutate({ id, patch })}
            />
          </TabsContent>
        </Tabs>
      </div>

      <EmpresaSheet empresa={selected} onClose={close} />
      <NewEmpresaDialog open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}

function PipelineBoard({
  empresas,
  loading,
  onOpen,
  onMove,
}: {
  empresas: Empresa[];
  loading: boolean;
  onOpen: (id: string) => void;
  onMove: (id: string, estagio: EmpresaEstagio) => void;
}) {
  const [dragging, setDragging] = useState<string | null>(null);
  const active = empresas.filter((empresa) => !["perdido", "adormecido", "ganho"].includes(empresa.estagio));
  const semNextStep = active.filter(needsNextStep).length;
  const propostas = empresas.filter((e) => e.estagio === "proposta");
  const ganhas = empresas.filter((e) => e.estagio === "ganho");

  const valorPipeline = sumValor(active);
  const valorPonderado = active.reduce((acc, e) => acc + (e.valor_estimado ?? 0) * STAGE_PROB[e.estagio], 0);

  const atividadesQ = useQuery({ queryKey: ["crm-atividades-all"], queryFn: () => crm.listAtividades() });
  const atividades = atividadesQ.data ?? [];
  const respondidas = atividades.filter((a) => a.resultado !== "sem_resposta").length;
  const taxaResposta = atividades.length ? Math.round((respondidas / atividades.length) * 100) : 0;

  const drop = (event: DragEvent, estagio: EmpresaEstagio) => {
    event.preventDefault();
    const id = event.dataTransfer.getData("text/plain") || dragging;
    if (id) onMove(id, estagio);
    setDragging(null);
  };

  return (
    <div className="space-y-6">
      {/* Scoreboard de vendas */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Valor em pipeline" value={eur(valorPipeline)} sub={`${active.length} empresas ativas`} tone="ink" />
        <Stat label="Pipeline ponderado" value={eur(valorPonderado)} sub="por probabilidade" tone="accent" />
        <Stat label="Propostas abertas" value={String(propostas.length)} sub={eur(sumValor(propostas))} tone="amber" />
        <Stat label="Ganho" value={eur(sumValor(ganhas))} sub={`${ganhas.length} fechad${ganhas.length === 1 ? "o" : "os"}`} tone="green" icon={Trophy} />
        <Stat label="Taxa de resposta" value={`${taxaResposta}%`} sub={`${respondidas}/${atividades.length} toques`} tone="blue" />
      </div>

      {semNextStep > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-[#a8432f]/25 bg-[#fff1ed] px-4 py-2.5 text-sm text-[#a8432f]">
          <span className="font-mono text-base font-semibold">{semNextStep}</span>
          empresa{semNextStep === 1 ? "" : "s"} ativa{semNextStep === 1 ? "" : "s"} sem próximo passo com data. Define a próxima ação.
        </div>
      )}

      {/* Funil */}
      <div className="relative left-1/2 w-screen -translate-x-1/2 px-4 sm:px-6 lg:px-10">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {PIPELINE_STAGES.map((stage) => (
            <StageColumn
              key={stage.v}
              stage={stage}
              empresas={empresas.filter((empresa) => empresa.estagio === stage.v)}
              dragging={dragging}
              onDragStart={(id) => setDragging(id)}
              onDrop={drop}
              onOpen={onOpen}
            />
          ))}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {EXIT_STAGES.map((stage) => (
          <StageColumn
            key={stage.v}
            stage={stage}
            empresas={empresas.filter((empresa) => empresa.estagio === stage.v)}
            dragging={dragging}
            compact
            onDragStart={(id) => setDragging(id)}
            onDrop={drop}
            onOpen={onOpen}
          />
        ))}
      </div>

      {loading && <p className="text-sm text-muted-foreground">A carregar pipeline...</p>}
    </div>
  );
}

function StageColumn({
  stage,
  empresas,
  dragging,
  compact = false,
  onDragStart,
  onDrop,
  onOpen,
}: {
  stage: { v: EmpresaEstagio; l: string; hint: string };
  empresas: Empresa[];
  dragging: string | null;
  compact?: boolean;
  onDragStart: (id: string) => void;
  onDrop: (event: DragEvent, estagio: EmpresaEstagio) => void;
  onOpen: (id: string) => void;
}) {
  const color = STAGE_COLOR[stage.v];
  const total = sumValor(empresas);

  return (
    <section
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => onDrop(event, stage.v)}
      className={`overflow-hidden rounded-2xl border border-[#1a1813]/10 bg-[#ece8de]/70 ${dragging ? "ring-1 ring-[var(--ring)]/40" : ""}`}
      title={stage.hint}
      style={{ borderTop: `3px solid ${color}` }}
    >
      <header className="border-b border-[#1a1813]/10 px-4 py-3">
        <div className="flex items-baseline justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: color }} />
            <h2 className="text-xl tracking-tight">{stage.l}</h2>
          </div>
          <span className="rounded-full bg-[#1a1813]/8 px-2 py-0.5 font-mono text-[11px] text-foreground/70">{empresas.length}</span>
        </div>
        <p className="mt-1.5 font-mono text-[11px] font-medium" style={{ color }}>{total > 0 ? eur(total) : "—"}</p>
        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">{stage.hint}</p>
      </header>

      <div className={`space-y-2 p-3 ${compact ? "min-h-[120px]" : "min-h-[220px] lg:min-h-[420px]"}`}>
        {empresas.map((empresa) => (
          <EmpresaCard key={empresa.id} empresa={empresa} onDragStart={onDragStart} onOpen={onOpen} />
        ))}
        {empresas.length === 0 && (
          <div className="rounded-xl border border-dashed border-[#1a1813]/12 bg-[#f6f1e6]/50 px-3 py-4 text-xs text-muted-foreground">
            Arrasta empresas para aqui.
          </div>
        )}
      </div>
    </section>
  );
}

function EmpresaCard({
  empresa,
  onDragStart,
  onOpen,
}: {
  empresa: Empresa;
  onDragStart: (id: string) => void;
  onOpen: (id: string) => void;
}) {
  const status = nextStepStatus(empresa);

  return (
    <article
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", empresa.id);
        onDragStart(empresa.id);
      }}
      className={`group rounded-xl border bg-[#fbfaf6] p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[var(--ring)] ${
        status === "missing" ? "border-[#a8432f]/35" : "border-[#1a1813]/10"
      }`}
    >
      <button type="button" onClick={() => onOpen(empresa.id)} className="w-full text-left">
        <div className="flex items-start gap-2">
          <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground opacity-35 group-hover:opacity-70" />
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-medium">{empresa.nome}</h3>
            <p className="mt-1 flex min-w-0 items-center gap-1 text-[11px] text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{empresa.localizacao ?? empresa.setor ?? "Sem contexto"}</span>
            </p>
          </div>
        </div>

        {empresa.valor_estimado != null && (
          <p className="mt-2.5 font-mono text-sm font-semibold text-foreground">{eur(empresa.valor_estimado)}</p>
        )}

        <div className="mt-2 flex flex-wrap gap-1.5">
          {empresa.responsavel && <Chip>{empresa.responsavel}</Chip>}
          {empresa.vertical && <Chip>{VERTICAL_LABEL[empresa.vertical]}</Chip>}
        </div>

        <div className={`mt-3 rounded-lg px-2.5 py-2 text-[11px] ${status === "ok" ? "bg-[#efe9dc] text-muted-foreground" : "bg-[#fff1ed] text-[#a8432f]"}`}>
          <p className="font-mono uppercase tracking-[0.12em]">{status === "missing" ? "sem next step" : status === "late" ? "atrasado" : "próximo passo"}</p>
          <p className="mt-1 line-clamp-2 text-foreground/80">{empresa.proximo_passo || "Definir próxima ação"}</p>
          {empresa.proximo_passo_data && (
            <p className="mt-1 font-mono text-[10px]">{new Date(empresa.proximo_passo_data).toLocaleDateString("pt-PT")}</p>
          )}
        </div>
      </button>
    </article>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[#efe9dc] px-2 py-0.5 text-[10px] font-medium text-foreground/70">
      {children}
    </span>
  );
}

function EmpresasTable({
  empresas,
  onOpen,
  onPatch,
}: {
  empresas: Empresa[];
  onOpen: (id: string) => void;
  onPatch: (id: string, patch: Partial<Empresa>) => void;
}) {
  const [q, setQ] = useState("");
  const [estagio, setEstagio] = useState("todos");
  const [vertical, setVertical] = useState("todos");
  const [responsavel, setResponsavel] = useState("todos");
  const [origem, setOrigem] = useState("todos");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return empresas.filter((empresa) => {
      if (query && ![empresa.nome, empresa.setor, empresa.localizacao].some((v) => v?.toLowerCase().includes(query))) return false;
      if (estagio !== "todos" && empresa.estagio !== estagio) return false;
      if (vertical !== "todos" && empresa.vertical !== vertical) return false;
      if (responsavel !== "todos" && empresa.responsavel !== responsavel) return false;
      if (origem !== "todos" && empresa.origem !== origem) return false;
      return true;
    });
  }, [empresas, estagio, origem, q, responsavel, vertical]);

  return (
    <section className="rounded-2xl border border-[#1a1813]/10 bg-[#fbfaf6]">
      <div className="border-b border-[#1a1813]/10 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="vouga-label">Empresas</p>
            <h2 className="mt-1 text-3xl tracking-tight">Base comercial</h2>
          </div>
          <div className="flex min-w-0 flex-wrap gap-2">
            <div className="flex h-9 min-w-[220px] items-center gap-2 rounded-full border border-[#1a1813]/10 bg-[#f1eee6] px-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Procurar..." className="h-7 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0" />
            </div>
            <FilterSelect value={estagio} onValueChange={setEstagio} allLabel="Estágio" items={ALL_STAGES.map((s) => ({ v: s.v, l: s.l }))} />
            <FilterSelect value={vertical} onValueChange={setVertical} allLabel="Vertical" items={VERTICALS} />
            <FilterSelect value={responsavel} onValueChange={setResponsavel} allLabel="Responsável" items={RESPONSAVEIS.map((r) => ({ v: r, l: r }))} />
            <FilterSelect value={origem} onValueChange={setOrigem} allLabel="Origem" items={ORIGENS.map((o) => ({ v: o, l: o }))} />
          </div>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Empresa</TableHead>
            <TableHead>Estágio</TableHead>
            <TableHead>Vertical</TableHead>
            <TableHead>Responsável</TableHead>
            <TableHead>Origem</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Próximo passo</TableHead>
            <TableHead>Data</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((empresa) => (
            <TableRow key={empresa.id}>
              <TableCell>
                <button type="button" onClick={() => onOpen(empresa.id)} className="text-left">
                  <span className="block font-medium">{empresa.nome}</span>
                  <span className="text-xs text-muted-foreground">{empresa.localizacao ?? empresa.setor ?? "Sem contexto"}</span>
                </button>
              </TableCell>
              <TableCell>
                <InlineSelect value={empresa.estagio} items={ALL_STAGES.map((s) => ({ v: s.v, l: s.l }))} onValueChange={(v) => onPatch(empresa.id, { estagio: v as EmpresaEstagio })} />
              </TableCell>
              <TableCell>
                <InlineSelect value={empresa.vertical ?? "none"} items={[{ v: "none", l: "Sem vertical" }, ...VERTICALS]} onValueChange={(v) => onPatch(empresa.id, { vertical: v === "none" ? null : (v as EmpresaVertical) })} />
              </TableCell>
              <TableCell>
                <InlineSelect value={empresa.responsavel ?? "none"} items={[{ v: "none", l: "Sem dono" }, ...RESPONSAVEIS.map((r) => ({ v: r, l: r }))]} onValueChange={(v) => onPatch(empresa.id, { responsavel: v === "none" ? null : v })} />
              </TableCell>
              <TableCell>
                <InlineSelect value={empresa.origem ?? "none"} items={[{ v: "none", l: "Sem origem" }, ...ORIGENS.map((o) => ({ v: o, l: o }))]} onValueChange={(v) => onPatch(empresa.id, { origem: v === "none" ? null : v })} />
              </TableCell>
              <TableCell>
                <EuroInput value={empresa.valor_estimado} onCommit={(v) => onPatch(empresa.id, { valor_estimado: v })} />
              </TableCell>
              <TableCell>
                <BlurInput value={empresa.proximo_passo ?? ""} placeholder="Definir ação" onCommit={(v) => onPatch(empresa.id, { proximo_passo: v || null })} />
              </TableCell>
              <TableCell>
                <Input type="date" defaultValue={empresa.proximo_passo_data?.slice(0, 10) ?? ""} onBlur={(e) => onPatch(empresa.id, { proximo_passo_data: e.target.value || null })} className="h-8 min-w-[136px] rounded-lg bg-background" />
              </TableCell>
            </TableRow>
          ))}
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                Sem empresas para estes filtros.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </section>
  );
}

function EmpresaSheet({ empresa, onClose }: { empresa: Empresa | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [notes, setNotes] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [nextDate, setNextDate] = useState("");

  useEffect(() => {
    setNotes(empresa?.notas ?? "");
    setNextStep(empresa?.proximo_passo ?? "");
    setNextDate(empresa?.proximo_passo_data?.slice(0, 10) ?? "");
  }, [empresa?.id, empresa?.notas, empresa?.proximo_passo, empresa?.proximo_passo_data]);

  const contactosQ = useQuery({
    queryKey: ["crm-contactos", empresa?.id],
    enabled: !!empresa,
    queryFn: () => crm.listContactos(empresa!.id),
  });
  const atividadesQ = useQuery({
    queryKey: ["crm-atividades", empresa?.id],
    enabled: !!empresa,
    queryFn: () => crm.listAtividades(empresa!.id),
  });

  const patch = useMutation({
    mutationFn: (patch: Partial<Empresa>) => crm.updateEmpresa(empresa!.id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-empresas"] }),
    onError: (e) => toast.error((e as Error).message),
  });
  const addContacto = useMutation({
    mutationFn: (input: Omit<Contacto, "id" | "created_at">) => crm.createContacto(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-contactos", empresa?.id] });
      toast.success("Contacto criado.");
    },
    onError: (e) => toast.error((e as Error).message),
  });
  const addAtividade = useMutation({
    mutationFn: (input: Omit<Atividade, "id">) => crm.createAtividade(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-atividades", empresa?.id] });
      qc.invalidateQueries({ queryKey: ["crm-empresas"] });
      toast.success("Atividade registada.");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const commitNextStep = () => patch.mutate({ proximo_passo: nextStep || null, proximo_passo_data: nextDate || null });

  return (
    <Sheet open={!!empresa} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        {empresa && (
          <>
            <SheetHeader>
              <p className="vouga-label">Empresa</p>
              <SheetTitle className="text-3xl">{empresa.nome}</SheetTitle>
            </SheetHeader>

            <div className="mt-6 space-y-8">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Estágio">
                  <InlineSelect value={empresa.estagio} items={ALL_STAGES.map((s) => ({ v: s.v, l: s.l }))} onValueChange={(v) => patch.mutate({ estagio: v as EmpresaEstagio })} />
                </Field>
                <Field label="Responsável">
                  <InlineSelect value={empresa.responsavel ?? "none"} items={[{ v: "none", l: "Sem dono" }, ...RESPONSAVEIS.map((r) => ({ v: r, l: r }))]} onValueChange={(v) => patch.mutate({ responsavel: v === "none" ? null : v })} />
                </Field>
                <Field label="Valor estimado">
                  <EuroInput value={empresa.valor_estimado} onCommit={(v) => patch.mutate({ valor_estimado: v })} />
                </Field>
                <Field label="Localização">
                  <BlurInput value={empresa.localizacao ?? ""} placeholder="Santa Maria da Feira" onCommit={(v) => patch.mutate({ localizacao: v || null })} />
                </Field>
                <Field label="Setor">
                  <BlurInput value={empresa.setor ?? ""} placeholder="Moldes, metalomecânica..." onCommit={(v) => patch.mutate({ setor: v || null })} />
                </Field>
              </div>

              <div className="rounded-2xl border border-[#1a1813]/10 bg-[#f6f1e6] p-4">
                <p className="vouga-label">Próximo passo</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_160px_auto]">
                  <Input value={nextStep} onChange={(e) => setNextStep(e.target.value)} placeholder="Ex.: enviar email de follow-up" className="h-10 rounded-xl bg-background" />
                  <Input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} className="h-10 rounded-xl bg-background" />
                  <Button onClick={commitNextStep} className="rounded-xl">Guardar</Button>
                </div>
                {needsNextStep(empresa) && (
                  <p className="mt-2 text-xs text-[#a8432f]">Empresa ativa sem próximo passo com data.</p>
                )}
              </div>

              <SectionTitle icon={UserPlus} title="Contactos" action={<NewContactoForm empresaId={empresa.id} onCreate={(input) => addContacto.mutate(input)} />} />
              <ContactosList contactos={contactosQ.data ?? []} />

              <SectionTitle icon={MessageSquarePlus} title="Timeline de toques" action={<NewAtividadeForm empresaId={empresa.id} contactos={contactosQ.data ?? []} onCreate={(input) => addAtividade.mutate(input)} />} />
              <AtividadesList atividades={atividadesQ.data ?? []} contactos={contactosQ.data ?? []} />

              <Field label="Notas">
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onBlur={() => patch.mutate({ notas: notes || null })}
                  placeholder="Dor concreta, quem decide, contexto e motivo de saída se for perdido/adormecido."
                  className="min-h-32"
                />
              </Field>

              <div className="rounded-2xl border border-dashed border-[#1a1813]/15 bg-[#f6f1e6]/70 p-4">
                <p className="vouga-label">Modelos de mensagem</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Atalho preparado para a Fase 3: modelos com variáveis tipo {"{nome}"} e {"{empresa}"}.
                </p>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function NewEmpresaDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const [setor, setSetor] = useState("");
  const [localizacao, setLocalizacao] = useState("");
  const [responsavel, setResponsavel] = useState("none");
  const [vertical, setVertical] = useState("none");
  const [origem, setOrigem] = useState("none");
  const [valor, setValor] = useState("");

  const create = useMutation({
    mutationFn: () =>
      crm.createEmpresa({
        nome: nome.trim(),
        setor,
        localizacao,
        responsavel: responsavel === "none" ? null : responsavel,
        vertical: vertical === "none" ? null : (vertical as EmpresaVertical),
        origem: origem === "none" ? null : origem,
        valor_estimado: valor.trim() && Number.isFinite(parseFloat(valor)) ? parseFloat(valor) : null,
      }),
    onSuccess: () => {
      reset();
      onClose();
      qc.invalidateQueries({ queryKey: ["crm-empresas"] });
      toast.success("Empresa criada.");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const reset = () => {
    setNome("");
    setSetor("");
    setLocalizacao("");
    setResponsavel("none");
    setVertical("none");
    setOrigem("none");
    setValor("");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <p className="vouga-label">CRM</p>
          <DialogTitle className="text-3xl">Nova empresa</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <Field label="Nome">
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Moldes Antuã" />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Setor">
              <Input value={setor} onChange={(e) => setSetor(e.target.value)} placeholder="Moldes" />
            </Field>
            <Field label="Localização">
              <Input value={localizacao} onChange={(e) => setLocalizacao(e.target.value)} placeholder="Oliveira de Azeméis" />
            </Field>
            <Field label="Vertical">
              <InlineSelect value={vertical} items={[{ v: "none", l: "Sem vertical" }, ...VERTICALS]} onValueChange={setVertical} />
            </Field>
            <Field label="Origem">
              <InlineSelect value={origem} items={[{ v: "none", l: "Sem origem" }, ...ORIGENS.map((o) => ({ v: o, l: o }))]} onValueChange={setOrigem} />
            </Field>
            <Field label="Valor estimado (€)">
              <Input type="number" inputMode="numeric" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="9000" />
            </Field>
          </div>
          <Field label="Responsável">
            <InlineSelect value={responsavel} items={[{ v: "none", l: "Sem dono" }, ...RESPONSAVEIS.map((r) => ({ v: r, l: r }))]} onValueChange={setResponsavel} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => { reset(); onClose(); }}>Cancelar</Button>
          <Button onClick={() => nome.trim() ? create.mutate() : toast.error("A empresa precisa de nome.")} disabled={create.isPending} className="gap-2">
            {create.isPending ? "A guardar..." : <>Criar <ArrowRight className="h-4 w-4" /></>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewContactoForm({ empresaId, onCreate }: { empresaId: string; onCreate: (input: Omit<Contacto, "id" | "created_at">) => void }) {
  const [nome, setNome] = useState("");
  const [cargo, setCargo] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");

  const submit = () => {
    if (!nome.trim()) return toast.error("O contacto precisa de nome.");
    onCreate({ empresa_id: empresaId, nome: nome.trim(), cargo: cargo || null, email: email || null, telefone: telefone || null, linkedin: null });
    setNome("");
    setCargo("");
    setEmail("");
    setTelefone("");
  };

  return (
    <div className="grid gap-2 rounded-2xl border border-[#1a1813]/10 bg-[#f6f1e6]/70 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome" className="h-9" />
        <Input value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="Cargo" className="h-9" />
        <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="h-9" />
        <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="Telefone" className="h-9" />
      </div>
      <Button size="sm" onClick={submit} className="w-fit gap-1.5"><Plus className="h-3.5 w-3.5" /> Contacto</Button>
    </div>
  );
}

function NewAtividadeForm({
  empresaId,
  contactos,
  onCreate,
}: {
  empresaId: string;
  contactos: Contacto[];
  onCreate: (input: Omit<Atividade, "id">) => void;
}) {
  const [tipo, setTipo] = useState<Atividade["tipo"]>("email");
  const [resultado, setResultado] = useState<Atividade["resultado"]>("sem_resposta");
  const [contactoId, setContactoId] = useState("none");
  const [nota, setNota] = useState("");

  const submit = () => {
    onCreate({
      empresa_id: empresaId,
      contacto_id: contactoId === "none" ? null : contactoId,
      tipo,
      resultado,
      nota: nota || null,
      data: new Date().toISOString(),
    });
    setNota("");
  };

  return (
    <div className="grid gap-2 rounded-2xl border border-[#1a1813]/10 bg-[#f6f1e6]/70 p-3">
      <div className="grid gap-2 sm:grid-cols-3">
        <InlineSelect value={tipo} items={ACTION_TYPES} onValueChange={(v) => setTipo(v as Atividade["tipo"])} />
        <InlineSelect value={resultado} items={RESULTADOS} onValueChange={(v) => setResultado(v as Atividade["resultado"])} />
        <InlineSelect value={contactoId} items={[{ v: "none", l: "Sem contacto" }, ...contactos.map((c) => ({ v: c.id, l: c.nome }))]} onValueChange={setContactoId} />
      </div>
      <div className="flex gap-2">
        <Input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Nota curta da atividade" className="h-9" onKeyDown={(e) => e.key === "Enter" && submit()} />
        <Button size="sm" onClick={submit} className="shrink-0">Registar</Button>
      </div>
    </div>
  );
}

function ContactosList({ contactos }: { contactos: Contacto[] }) {
  if (contactos.length === 0) return <p className="rounded-xl bg-[#f6f1e6] px-3 py-3 text-sm text-muted-foreground">Sem contactos ainda.</p>;
  return (
    <ul className="grid gap-2">
      {contactos.map((contacto) => (
        <li key={contacto.id} className="rounded-xl border border-[#1a1813]/10 bg-[#fbfaf6] p-3">
          <p className="font-medium">{contacto.nome}</p>
          {contacto.cargo && <p className="text-sm text-muted-foreground">{contacto.cargo}</p>}
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
            {contacto.email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{contacto.email}</span>}
            {contacto.telefone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{contacto.telefone}</span>}
          </div>
        </li>
      ))}
    </ul>
  );
}

function AtividadesList({ atividades, contactos }: { atividades: Atividade[]; contactos: Contacto[] }) {
  const contactoName = (id: string | null) => contactos.find((c) => c.id === id)?.nome;
  if (atividades.length === 0) return <p className="rounded-xl bg-[#f6f1e6] px-3 py-3 text-sm text-muted-foreground">Sem toques registados.</p>;
  return (
    <ol className="space-y-3 border-l border-[#1a1813]/12 pl-4">
      {atividades.map((atividade) => (
        <li key={atividade.id} className="relative rounded-xl border border-[#1a1813]/10 bg-[#fbfaf6] p-3">
          <span className="absolute -left-[21px] top-4 h-2.5 w-2.5 rounded-full bg-[var(--ring)]" />
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium">{ACTION_LABEL[atividade.tipo]}</p>
              <p className="text-xs text-muted-foreground">
                {RESULTADO_LABEL[atividade.resultado]}
                {contactoName(atividade.contacto_id) ? ` · ${contactoName(atividade.contacto_id)}` : ""}
              </p>
            </div>
            <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
              {new Date(atividade.data).toLocaleDateString("pt-PT")}
            </span>
          </div>
          {atividade.nota && <p className="mt-2 text-sm text-muted-foreground">{atividade.nota}</p>}
        </li>
      ))}
    </ol>
  );
}

function Stat({
  label,
  value,
  sub,
  tone = "ink",
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "ink" | "accent" | "amber" | "green" | "blue";
  icon?: ComponentType<{ className?: string; style?: CSSProperties }>;
}) {
  const COLOR: Record<string, string> = {
    ink: "#1a1813",
    accent: "#c97800",
    amber: "#df8b24",
    green: "#42b976",
    blue: "#4f8df5",
  };
  const c = COLOR[tone];
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#1a1813]/10 bg-[#fbfaf6] p-4">
      <span className="absolute inset-x-0 top-0 h-1" style={{ background: c }} />
      <div className="flex items-center justify-between">
        <p className="vouga-label">{label}</p>
        {Icon && <Icon className="h-4 w-4" style={{ color: c }} />}
      </div>
      <p className="mt-2 font-serif text-3xl leading-none tracking-tight" style={{ color: c }}>{value}</p>
      {sub && <p className="mt-1.5 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function FilterSelect({ value, onValueChange, allLabel, items }: { value: string; onValueChange: (v: string) => void; allLabel: string; items: { v: string; l: string }[] }) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="h-9 w-[150px] rounded-full bg-[#f1eee6] text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="todos">{allLabel}</SelectItem>
        {items.map((item) => <SelectItem key={item.v} value={item.v}>{item.l}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function InlineSelect({ value, onValueChange, items }: { value: string; onValueChange: (v: string) => void; items: { v: string; l: string }[] }) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="h-8 min-w-[130px] rounded-lg bg-background text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => <SelectItem key={item.v} value={item.v}>{item.l}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function BlurInput({ value, placeholder, onCommit }: { value: string; placeholder?: string; onCommit: (value: string) => void }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <Input
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => onCommit(draft.trim())}
      className="h-8 rounded-lg bg-background"
    />
  );
}

function EuroInput({ value, onCommit }: { value: number | null; onCommit: (value: number | null) => void }) {
  const [draft, setDraft] = useState(value != null ? String(value) : "");
  useEffect(() => setDraft(value != null ? String(value) : ""), [value]);
  return (
    <div className="flex h-8 items-center rounded-lg bg-background pl-2 ring-1 ring-[#1a1813]/10 focus-within:ring-[var(--ring)]">
      <span className="text-xs text-muted-foreground">€</span>
      <Input
        type="number"
        inputMode="numeric"
        value={draft}
        placeholder="0"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { const n = parseFloat(draft); onCommit(Number.isFinite(n) ? n : null); }}
        className="h-8 w-[90px] border-0 bg-transparent px-1 text-sm shadow-none focus-visible:ring-0"
      />
    </div>
  );
}

function SectionTitle({ icon: Icon, title, action }: { icon: ComponentType<{ className?: string }>; title: string; action?: ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-[var(--ring)]" />
        <p className="vouga-label">{title}</p>
      </div>
      {action}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="space-y-2"><Label className="vouga-label">{label}</Label>{children}</div>;
}

function nextStepStatus(empresa: Empresa) {
  if (!needsNextStep(empresa)) return "ok";
  if (!empresa.proximo_passo_data) return "missing";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(empresa.proximo_passo_data);
  return due.getTime() < today.getTime() ? "late" : "ok";
}

function needsNextStep(empresa: Empresa) {
  if (["ganho", "perdido", "adormecido"].includes(empresa.estagio)) return false;
  return !empresa.proximo_passo || !empresa.proximo_passo_data;
}
