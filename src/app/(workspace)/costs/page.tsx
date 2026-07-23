import Link from "next/link";

import {
  COST_CATEGORY_LABELS,
  COST_RECURRENCE_LABELS,
  COST_STATUS_LABELS,
} from "@/domain/costs/cost";
import { createCostModule } from "@/foundation/composition/costs";
import {
  calculateCashPositions,
  deriveCostOccurrences,
  groupCostTotals,
} from "@/projections/costs/cost-finance";
import type { CostListItem } from "@/projections/costs/cost-read-model";

import { CashBalanceForm } from "./cash-balance-form";

export default async function CostsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const params = await searchParams;
  const history = params.view === "history";
  const { readModel, service } = await createCostModule();
  const [costs, snapshots, options] = await Promise.all([
    readModel.list(),
    readModel.listCashBalances(),
    service.getFormOptions(),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const end = new Date();
  end.setUTCFullYear(end.getUTCFullYear() + 2);
  const occurrences = deriveCostOccurrences(
    costs,
    `${today.slice(0, 4)}-01-01`,
    end.toISOString().slice(0, 10),
  );
  const month = groupCostTotals(
    occurrences.filter((occurrence) => occurrence.occursOn.slice(0, 7) === today.slice(0, 7)),
    "month",
  );
  const year = groupCostTotals(
    occurrences.filter((occurrence) => occurrence.occursOn.slice(0, 4) === today.slice(0, 4)),
    "year",
  );
  const positions = calculateCashPositions(
    snapshots,
    occurrences,
    today,
    end.toISOString().slice(0, 10),
  );
  const recurring = costs.filter(
    (cost) => cost.costType === "recurring" && !["ended", "cancelled"].includes(cost.status),
  );
  const oneOff = costs.filter(
    (cost) => cost.costType === "one_off" && !["paid", "cancelled"].includes(cost.status),
  );
  const nextOccurrenceByCost = new Map<string, string>();
  for (const occurrence of occurrences) {
    if (occurrence.occursOn >= today && !nextOccurrenceByCost.has(occurrence.costId)) {
      nextOccurrenceByCost.set(occurrence.costId, occurrence.occursOn);
    }
  }
  const upcoming = [...recurring, ...oneOff]
    .filter((cost) => nextOccurrenceByCost.has(cost.id) || nextDate(cost) >= today)
    .sort((left, right) =>
      (nextOccurrenceByCost.get(left.id) ?? nextDate(left)).localeCompare(
        nextOccurrenceByCost.get(right.id) ?? nextDate(right),
      ),
    );
  const historical = costs.filter((cost) => ["paid", "ended", "cancelled"].includes(cost.status));

  return (
    <main className="workspace-main module-main">
      <div className="module-heading">
        <div>
          <h1 className="display">Costs</h1>
          <p className="workspace-intro">Caixa, runway e próximos pagamentos.</p>
        </div>
        <div className="calendar-create-links">
          <Link className="button-secondary" href={history ? "/costs" : "/costs?view=history"}>
            {history ? "Voltar ao overview" : "Ver histórico"}
          </Link>
          <Link className="button-primary" href="/costs/new">New cost</Link>
        </div>
      </div>

      {history ? (
        <CostSection
          costs={historical}
          description="Custos pagos, terminados ou cancelados continuam preservados."
          empty="Ainda não existem Costs encerrados."
          title="Histórico"
        />
      ) : (
        <>
          <section className="cost-metrics" aria-label="Posição financeira conhecida">
            <Metric label="Este mês" values={month} empty="Sem custos conhecidos" />
            <Metric label="Este ano" values={year} empty="Sem custos conhecidos" />
            <div className="detail-card">
              <p className="eyebrow">Caixa estimada hoje</p>
              {positions.length ? positions.map((position) => (
                <div className="cost-metric-line" key={position.currency}>
                  <strong>{money(position.estimatedBalanceMinor, position.currency)}</strong>
                  <span>{money(position.confirmedBalanceMinor, position.currency)} confirmado</span>
                </div>
              )) : <p>Confirma um saldo para calcular a posição.</p>}
            </div>
            <div className="detail-card">
              <p className="eyebrow">Runway · apenas Costs</p>
              {positions.length ? positions.map((position) => (
                <div className="cost-metric-line" key={position.currency}>
                  <strong>
                    {position.runwayMonths === null ? "Mais de 24 meses" : `${position.runwayMonths} meses`}
                  </strong>
                  <span>
                    {position.runwayExhaustedOn ? `até ${date(position.runwayExhaustedOn)}` : "não esgota na janela"}
                    {" · assume receita zero"}
                  </span>
                </div>
              )) : <p>Indisponível sem saldo confirmado.</p>}
            </div>
          </section>

          <details className="detail-card cost-balance-panel">
            <summary>Atualizar saldo confirmado</summary>
            <div className="collection-heading">
              <p>Cada confirmação cria um snapshot imutável; não é uma conta bancária nem um ledger.</p>
            </div>
            <CashBalanceForm members={options.members} />
          </details>

          <CostSection
            costs={upcoming}
            description="Próximos compromissos com uma data conhecida."
            empty="Não existem pagamentos futuros conhecidos."
            title="A seguir"
          />
          <CostSection
            costs={recurring}
            description="Subscrições e outros compromissos recorrentes ativos."
            empty="Não existem Costs recorrentes ativos."
            title="Recorrentes"
          />
          <CostSection
            costs={oneOff}
            description="Compromissos pontuais ainda abertos."
            empty="Não existem Costs pontuais em aberto."
            title="Pontuais"
          />
        </>
      )}
    </main>
  );
}

function CostSection({
  costs,
  description,
  empty,
  title,
}: {
  costs: readonly CostListItem[];
  description: string;
  empty: string;
  title: string;
}) {
  return (
    <section className="collection-section">
      <div className="collection-heading">
        <div>
          <p className="eyebrow">{costs.length} {costs.length === 1 ? "Cost" : "Costs"}</p>
          <h2 className="section-title">{title}</h2>
        </div>
        <p>{description}</p>
      </div>
      {costs.length ? (
        <div className="collection-list">
          {costs.map((cost) => <CostRow cost={cost} key={cost.id} />)}
        </div>
      ) : (
        <div className="empty-state empty-state-compact">
          <p>{empty}</p>
        </div>
      )}
    </section>
  );
}

function CostRow({ cost }: { cost: CostListItem }) {
  const next = cost.paidOn ?? cost.expectedOn ?? cost.billingAnchorOn;
  return (
    <Link className="collection-row collection-row-cost" href={`/costs/${cost.id}`}>
      <div className="collection-primary">
        <span className={`status-pill status-pill-${cost.status}`}>
          {COST_STATUS_LABELS[cost.status]}
        </span>
        <h2>{cost.title}</h2>
        <p>{cost.description}</p>
      </div>
      <div className="collection-meta">
        <span><b>Valor</b>{money(cost.actualAmountMinor ?? cost.expectedAmountMinor, cost.currency)}</span>
        <span>
          <b>Calendário</b>
          {cost.recurrence ? COST_RECURRENCE_LABELS[cost.recurrence] : next ? date(next) : "Sem data"}
        </span>
        <span>
          <b>Contexto</b>
          {cost.companyName ?? cost.roadmapItemTitle ?? cost.sourceDecisionTitle ?? "Sem relação direta"}
        </span>
        <span><b>Categoria</b>{COST_CATEGORY_LABELS[cost.category]}</span>
      </div>
    </Link>
  );
}

function Metric({
  label,
  values,
  empty,
}: {
  label: string;
  values: readonly {
    currency: string;
    amountMinor: number;
    confirmedMinor: number;
    expectedMinor: number;
    derivedMinor: number;
  }[];
  empty: string;
}) {
  return (
    <div className="detail-card">
      <p className="eyebrow">{label}</p>
      {values.length ? values.map((value) => (
        <div className="cost-metric-line" key={value.currency}>
          <strong>{money(value.amountMinor, value.currency)}</strong>
          <span>
            {money(value.confirmedMinor, value.currency)} confirmado ·{" "}
            {money(value.expectedMinor + value.derivedMinor, value.currency)} conhecido
          </span>
        </div>
      )) : <p>{empty}</p>}
    </div>
  );
}

function nextDate(cost: CostListItem) {
  return cost.expectedOn ?? cost.billingAnchorOn ?? "9999-12-31";
}

function money(value: number, currency: string) {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency }).format(value / 100);
}

function date(value: string) {
  return new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(`${value.slice(0, 10)}T00:00:00Z`),
  );
}
