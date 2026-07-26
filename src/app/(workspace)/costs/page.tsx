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
          <p className="workspace-intro">Caixa e compromissos.</p>
        </div>
        <div className="calendar-create-links">
          <Link className="button-secondary" href={history ? "/costs" : "/costs?view=history"}>
            {history ? "Overview" : "Histórico"}
          </Link>
          <Link className="button-primary" href="/costs/new">
            Novo custo
          </Link>
        </div>
      </div>

      {history ? (
        <CostSection
          costs={historical}
          empty="Ainda não existem Costs encerrados."
          title="Histórico"
        />
      ) : (
        <>
          <section className="cost-overview" aria-label="Posição financeira conhecida">
            <Metric label="Este mês" values={month} empty="Sem custos conhecidos" />
            <Metric label="Este ano" values={year} empty="Sem custos conhecidos" />
            <div className="cost-overview-item">
              <p>Caixa hoje</p>
              {positions.length ? (
                positions.map((position) => (
                  <div className="cost-metric-line" key={position.currency}>
                    <strong>{money(position.estimatedBalanceMinor, position.currency)}</strong>
                    <span>
                      {money(position.confirmedBalanceMinor, position.currency)} confirmado
                    </span>
                  </div>
                ))
              ) : (
                <span className="cost-overview-empty">Saldo por confirmar</span>
              )}
            </div>
            <div className="cost-overview-item">
              <p>Runway</p>
              {positions.length ? (
                positions.map((position) => (
                  <div className="cost-metric-line" key={position.currency}>
                    <strong>
                      {position.runwayMonths === null
                        ? "Mais de 24 meses"
                        : `${position.runwayMonths} meses`}
                    </strong>
                    <span>
                      {position.runwayExhaustedOn
                        ? `até ${date(position.runwayExhaustedOn)}`
                        : "não esgota na janela"}
                      {" · receita zero"}
                    </span>
                  </div>
                ))
              ) : (
                <span className="cost-overview-empty">Indisponível sem saldo</span>
              )}
            </div>
          </section>

          <details className="cost-balance-disclosure">
            <summary>
              <span>Saldo confirmado</span>
              <small>Atualizar</small>
            </summary>
            <div className="cost-balance-content">
              <p>Cada confirmação guarda um snapshot imutável.</p>
              <CashBalanceForm members={options.members} />
            </div>
          </details>

          <CostSection
            costs={upcoming}
            empty="Não existem pagamentos futuros conhecidos."
            nextOccurrenceByCost={nextOccurrenceByCost}
            title="Compromissos"
          />
        </>
      )}
    </main>
  );
}

function CostSection({
  costs,
  empty,
  nextOccurrenceByCost,
  title,
}: {
  costs: readonly CostListItem[];
  empty: string;
  nextOccurrenceByCost?: ReadonlyMap<string, string>;
  title: string;
}) {
  return (
    <section className="cost-list-section">
      <header className="cost-list-heading">
        <h2>{title}</h2>
        <span>{costs.length}</span>
      </header>
      {costs.length ? (
        <div className="cost-list">
          {costs.map((cost) => (
            <CostRow
              cost={cost}
              key={cost.id}
              nextOccurrence={nextOccurrenceByCost?.get(cost.id)}
            />
          ))}
        </div>
      ) : (
        <p className="cost-list-empty">{empty}</p>
      )}
    </section>
  );
}

function CostRow({ cost, nextOccurrence }: { cost: CostListItem; nextOccurrence?: string }) {
  const next = nextOccurrence ?? cost.paidOn ?? cost.expectedOn ?? cost.billingAnchorOn;
  const context = cost.companyName ?? cost.roadmapItemTitle ?? cost.sourceDecisionTitle;
  return (
    <Link className="cost-list-row" href={`/costs/${cost.id}`}>
      <div className="cost-list-primary">
        <div className="cost-list-title">
          <h3>{cost.title}</h3>
          <span className={`cost-list-status status-pill-${cost.status}`}>
            {COST_STATUS_LABELS[cost.status]}
          </span>
        </div>
        <p>
          {COST_CATEGORY_LABELS[cost.category]}
          {cost.supplier ? ` · ${cost.supplier}` : ""}
          {context ? ` · ${context}` : ""}
        </p>
      </div>
      <div className="cost-list-amount">
        <strong>{money(cost.actualAmountMinor ?? cost.expectedAmountMinor, cost.currency)}</strong>
        <span>
          {next ? date(next) : "Sem data"}
          {cost.recurrence ? ` · ${COST_RECURRENCE_LABELS[cost.recurrence]}` : ""}
        </span>
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
    <div className="cost-overview-item">
      <p>{label}</p>
      {values.length ? (
        values.map((value) => (
          <div className="cost-metric-line" key={value.currency}>
            <strong>{money(value.amountMinor, value.currency)}</strong>
            <span>
              {money(value.confirmedMinor, value.currency)} confirmado ·{" "}
              {money(value.expectedMinor + value.derivedMinor, value.currency)} conhecido
            </span>
          </div>
        ))
      ) : (
        <span className="cost-overview-empty">{empty}</span>
      )}
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
