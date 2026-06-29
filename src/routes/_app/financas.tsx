import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { finance } from "@/lib/data";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Calculator, Landmark, Plus, Receipt, Trash2, Wallet } from "lucide-react";

export const Route = createFileRoute("/_app/financas")({
  component: FinancasPage,
});

const PERIODS = [
  { v: "monthly", l: "Mensal" },
  { v: "annual", l: "Anual" },
  { v: "one_off", l: "Pontual" },
] as const;
type Period = (typeof PERIODS)[number]["v"];
const PERIOD_LABEL: Record<string, string> = Object.fromEntries(PERIODS.map((p) => [p.v, p.l]));

type Cost = {
  id: string;
  area: string;
  amount_cents: number;
  period: string;
  description: string | null;
  occurred_on: string;
};

const eur = (cents: number) =>
  (cents / 100).toLocaleString("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

const APOIOS = [
  {
    t: "StartUP Voucher · IAPMEI",
    d: "Encaixa, mas tem tensão com faturar já (fase de ideia, dedicação exclusiva). Confirmar datas e critérios com o IAPMEI antes de contar com ele.",
  },
  {
    t: "Vale Digitalização",
    d: "Alavanca de venda do lado do cliente, não nossa. Ajuda a fechar o cliente, não financia a Vouga.",
  },
  {
    t: "IEFP",
    d: "Apoios ao chão do builder core (draw / medidas de emprego). A confirmar elegibilidade.",
  },
];

function FinancasPage() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);

  const costsQ = useQuery({
    queryKey: ["costs"],
    queryFn: async () => (await finance.listCosts()) as Cost[],
  });
  const costs = costsQ.data ?? [];

  const monthlyBurn = costs.reduce((acc, c) => {
    if (c.period === "monthly") return acc + c.amount_cents;
    if (c.period === "annual") return acc + Math.round(c.amount_cents / 12);
    return acc;
  }, 0);
  const oneOff = costs.filter((c) => c.period === "one_off").reduce((a, c) => a + c.amount_cents, 0);
  const annualizedBurn = monthlyBurn * 12;

  const byArea = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of costs) {
      const monthlyEq = c.period === "annual" ? Math.round(c.amount_cents / 12) : c.period === "monthly" ? c.amount_cents : 0;
      if (monthlyEq) m.set(c.area, (m.get(c.area) ?? 0) + monthlyEq);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [costs]);

  // Caixa atual: guardada localmente (não há tabela de saldo).
  const [caixa, setCaixa] = useState<string>("");
  useEffect(() => {
    setCaixa(localStorage.getItem("vouga_caixa") ?? "");
  }, []);
  const caixaCents = Math.round((parseFloat(caixa.replace(",", ".")) || 0) * 100);
  const runway = monthlyBurn > 0 ? caixaCents / monthlyBurn : null;
  const runwayTone = runway == null ? "neutral" : runway < 2 ? "danger" : runway < 4 ? "warn" : "ok";

  const delCost = async (id: string) => {
    await finance.removeCost(id);
    qc.invalidateQueries({ queryKey: ["costs"] });
  };

  return (
    <div className="relative left-1/2 w-screen -translate-x-1/2 px-4 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-[1320px] space-y-10">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
        <p className="vouga-label">Finanças</p>
          <h1 className="mt-3 text-4xl tracking-tight md:text-6xl">Caixa e custos.</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Não é contabilidade, é sobrevivência e pricing com cabeça. Número
          honesto, não otimista.
        </p>
        </div>
        <Button onClick={() => setCreating(true)} className="w-fit gap-2 rounded-full px-5">
          <Plus className="h-4 w-4" /> Novo custo
        </Button>
      </header>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[24px] border border-[#1a1813]/10 bg-[#1a1813] p-5 text-[#f6f1e6] shadow-[0_24px_70px_-55px_rgba(26,24,19,0.9)] sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#f6f1e6]/55">Caixa atual</p>
              <div className="mt-5 flex items-baseline gap-2">
                <span className="text-[#f6f1e6]/50">€</span>
                <input
                  value={caixa}
                  onChange={(e) => setCaixa(e.target.value)}
                  onBlur={() => localStorage.setItem("vouga_caixa", caixa)}
                  placeholder="0"
                  inputMode="decimal"
                  className="min-w-0 flex-1 bg-transparent font-serif text-5xl leading-none tracking-tight text-[#f6f1e6] outline-none placeholder:text-[#f6f1e6]/20 sm:text-7xl"
                />
              </div>
              <p className="mt-3 text-xs text-[#f6f1e6]/45">Guardado neste dispositivo enquanto não houver tabela de saldo.</p>
            </div>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#f6f1e6]/10">
              <Wallet className="h-5 w-5" />
            </span>
          </div>

          <div className="mt-8 grid gap-px overflow-hidden rounded-2xl bg-[#f6f1e6]/12 sm:grid-cols-3">
            <FinanceStat label="Burn mensal" value={eur(monthlyBurn)} dark />
            <FinanceStat label="Runway" value={runway === null ? "—" : `${runway.toFixed(1)} m`} dark tone={runwayTone} />
            <FinanceStat label="Burn anualizado" value={eur(annualizedBurn)} dark />
          </div>
        </div>

        <div className="rounded-[24px] border border-[#1a1813]/10 bg-[#fbfaf6] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="vouga-label">Runway</p>
              <h2 className="mt-2 text-3xl tracking-tight">Margem de manobra</h2>
            </div>
            <span className={`rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] ${runwayTone === "danger" ? "bg-[#fff1ed] text-[#a8432f]" : runwayTone === "warn" ? "bg-[#fff7e7] text-[#8c5a13]" : "bg-[#eef4eb] text-[#52643e]"}`}>
              {runway === null ? "sem burn" : runwayTone === "danger" ? "crítico" : runwayTone === "warn" ? "atenção" : "saudável"}
            </span>
          </div>
          <div className="mt-8">
            <div className="h-3 overflow-hidden rounded-full bg-[#e7e2d6]">
              <div
                className={`h-full rounded-full ${runwayTone === "danger" ? "bg-[#a8432f]" : runwayTone === "warn" ? "bg-[#c97800]" : "bg-[#6e7a59]"}`}
                style={{ width: `${Math.min(100, ((runway ?? 0) / 6) * 100)}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              <span>0m</span><span>3m</span><span>6m+</span>
            </div>
          </div>
          <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
            {monthlyBurn > 0
              ? `Ao ritmo atual, cada mês consome ${eur(monthlyBurn)}. Custos pontuais registados: ${eur(oneOff)}.`
              : "Ainda não há custos recorrentes. Bom sinal, ou falta de registo."}
          </p>
        </div>
      </section>

      <section className="rounded-[24px] border border-[#1a1813]/10 bg-[#fbfaf6] p-4 sm:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="vouga-label">Custos</p>
            <h2 className="mt-2 text-3xl tracking-tight sm:text-4xl">O que sai todos os meses.</h2>
          </div>
          <span className="w-fit rounded-full border border-[#1a1813]/10 px-3 py-1 text-xs text-muted-foreground">
            {costs.length} registo{costs.length === 1 ? "" : "s"}
          </span>
        </div>

        {byArea.length > 0 && (
          <div className="mb-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {byArea.map(([area, cents]) => (
              <div key={area} className="rounded-2xl border border-[#1a1813]/10 bg-[#f1eee6] p-3">
                <p className="truncate text-sm">{area}</p>
                <p className="mt-1 font-serif text-2xl leading-none">{eur(cents)}<span className="text-sm text-muted-foreground">/m</span></p>
              </div>
            ))}
          </div>
        )}

        <ul className="grid gap-2">
          {costs.map((c) => (
            <li key={c.id} className="grid gap-3 rounded-2xl border border-[#1a1813]/10 bg-[#f6f1e6]/70 p-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{c.area}</p>
                {c.description && <p className="text-[11px] text-muted-foreground">{c.description}</p>}
              </div>
              <div className="flex items-center gap-3 sm:justify-end">
                <span className="rounded-full bg-[#fbfaf6] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{PERIOD_LABEL[c.period] ?? c.period}</span>
                <span className="font-mono text-sm">{eur(c.amount_cents)}</span>
              </div>
              <button onClick={() => delCost(c.id)} className="justify-self-start rounded-full p-2 text-muted-foreground transition-colors hover:bg-[#fff1ed] hover:text-destructive sm:justify-self-end">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
          {costs.length === 0 && (
            <li className="grid min-h-44 place-items-center rounded-2xl border border-dashed border-[#1a1813]/15 bg-[#f6f1e6]/60 p-6 text-center">
              <div>
                <Receipt className="mx-auto h-6 w-6 text-[var(--ring)]" />
                <p className="mt-3 text-sm text-muted-foreground">Sem custos registados.</p>
                <Button size="sm" onClick={() => setCreating(true)} className="mt-4 rounded-full">Adicionar custo</Button>
              </div>
            </li>
          )}
        </ul>
        {oneOff > 0 && (
          <p className="mt-2 text-[11px] text-muted-foreground">Custos pontuais (fora do burn): {eur(oneOff)}</p>
        )}
      </section>

      <PricingCalculator />

      {/* Apoios */}
      <section>
        <Head icon={Landmark} title="Apoios" />
        <div className="grid gap-4 sm:grid-cols-3">
          {APOIOS.map((a) => (
            <article key={a.t} className="rounded-lg border border-border bg-card p-5">
              <h3 className="text-lg tracking-tight">{a.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{a.d}</p>
            </article>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Confirma sempre datas e critérios na fonte antes de contar com qualquer apoio.
        </p>
      </section>

      <NewCostDialog open={creating} onClose={() => setCreating(false)} qc={qc} />
      </div>
    </div>
  );
}

function PricingCalculator() {
  const [preco, setPreco] = useState("8000");
  const [usos, setUsos] = useState("400");
  const [tokens, setTokens] = useState("12000");
  const [custo1k, setCusto1k] = useState("0.012");

  const n = (s: string) => parseFloat(s.replace(",", ".")) || 0;
  const inferenciaMes = (n(usos) * n(tokens) / 1000) * n(custo1k);
  const receita = n(preco);
  const margem = receita - inferenciaMes;
  const margemPct = receita > 0 ? (margem / receita) * 100 : 0;

  return (
    <section>
      <Head icon={Calculator} title="Calculadora de pricing" />
      <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
        Antes de pôr preço, estima utilizações por mês, tamanho de contexto e
        modelo. É o que separa margem saudável de serviço que dá prejuízo a cada
        chamada.
      </p>
      <div className="grid gap-6 rounded-lg border border-border bg-card p-6 md:grid-cols-2">
        <div className="space-y-4">
          <CalcField label="Preço do serviço (€ / mês ou projeto)" value={preco} onChange={setPreco} />
          <CalcField label="Utilizações por mês" value={usos} onChange={setUsos} />
          <CalcField label="Tokens médios por utilização" value={tokens} onChange={setTokens} />
          <CalcField label="Custo do modelo (€ / 1k tokens)" value={custo1k} onChange={setCusto1k} />
        </div>
        <div className="flex flex-col justify-center gap-4 border-t border-border pt-6 md:border-l md:border-t-0 md:pl-8 md:pt-0">
          <Result label="Custo de inferência / mês" value={inferenciaMes.toLocaleString("pt-PT", { style: "currency", currency: "EUR" })} />
          <Result label="Margem" value={margem.toLocaleString("pt-PT", { style: "currency", currency: "EUR" })} />
          <Result
            label="Margem %"
            value={`${margemPct.toFixed(0)}%`}
            tone={margemPct < 60 ? "warn" : "ok"}
          />
        </div>
      </div>
    </section>
  );
}

function FinanceStat({
  label,
  value,
  dark = false,
  tone = "neutral",
}: {
  label: string;
  value: string;
  dark?: boolean;
  tone?: "neutral" | "danger" | "warn" | "ok";
}) {
  const toneClass =
    tone === "danger"
      ? "text-[#ffb19f]"
      : tone === "warn"
        ? "text-[#ffd28a]"
        : tone === "ok"
          ? "text-[#c7dfb7]"
          : dark
            ? "text-[#f6f1e6]"
            : "text-foreground";

  return (
    <div className={`${dark ? "bg-[#f6f1e6]/8" : "bg-background"} p-4`}>
      <p className={`font-serif text-3xl leading-none ${toneClass}`}>{value}</p>
      <p className={`mt-2 font-mono text-[10px] uppercase tracking-[0.14em] ${dark ? "text-[#f6f1e6]/45" : "text-muted-foreground"}`}>
        {label}
      </p>
    </div>
  );
}

function CalcField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} inputMode="decimal" />
    </div>
  );
}

function Result({ label, value, tone }: { label: string; value: string; tone?: "warn" | "ok" }) {
  return (
    <div>
      <p className="vouga-label">{label}</p>
      <p className={`font-serif text-3xl leading-none ${tone === "warn" ? "text-destructive" : ""}`}>{value}</p>
    </div>
  );
}

function NewCostDialog({
  open,
  onClose,
  qc,
}: {
  open: boolean;
  onClose: () => void;
  qc: ReturnType<typeof useQueryClient>;
}) {
  const [area, setArea] = useState("");
  const [amount, setAmount] = useState("");
  const [period, setPeriod] = useState<Period>("monthly");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => { setArea(""); setAmount(""); setPeriod("monthly"); setDescription(""); };

  const submit = async () => {
    if (!area.trim()) return toast.error("Indica a área do custo.");
    const cents = Math.round((parseFloat(amount.replace(",", ".")) || 0) * 100);
    setSaving(true);
    try {
      await finance.createCost({ area: area.trim(), amount_cents: cents, period, description: description || null });
    } catch (e) {
      setSaving(false);
      return toast.error((e as Error).message);
    }
    setSaving(false);
    toast.success("Custo registado.");
    reset();
    onClose();
    qc.invalidateQueries({ queryKey: ["costs"] });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo custo</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Área</Label>
            <Input value={area} onChange={(e) => setArea(e.target.value)} placeholder="Inferência, ferramentas, contabilidade…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Valor (€)</Label>
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label>Periodicidade</Label>
              <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PERIODS.map((p) => <SelectItem key={p.v} value={p.v}>{p.l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => { reset(); onClose(); }} disabled={saving}>Cancelar</Button>
          <Button onClick={submit} disabled={saving || !area.trim()}>{saving ? "A guardar…" : "Registar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Head({
  icon: Icon,
  title,
  count,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  count?: number;
}) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <h2 className="text-sm">{title}</h2>
      {typeof count === "number" && <span className="text-xs text-muted-foreground">{count}</span>}
    </div>
  );
}
