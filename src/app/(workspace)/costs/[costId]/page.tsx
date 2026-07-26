import Link from "next/link";
import { notFound } from "next/navigation";
import {
  COST_CATEGORY_LABELS,
  COST_RECURRENCE_LABELS,
  COST_STATUS_LABELS,
  COST_TYPE_LABELS,
} from "@/domain/costs/cost";
import { createCostModule } from "@/foundation/composition/costs";
import { createContextEngine } from "@/foundation/composition/context-engine";
import { ConfirmAction } from "@/foundation/ui/confirm-action";
import { ContextPanel } from "../../context-panel";
import {
  activateCostAction,
  cancelCostTodayAction,
  endCostAction,
  payCostAction,
} from "../actions";

export default async function CostPage({ params }: { params: Promise<{ costId: string }> }) {
  const { costId } = await params;
  const [{ readModel }, contextEngine] = await Promise.all([
    createCostModule(),
    createContextEngine(),
  ]);
  const [cost, context] = await Promise.all([
    readModel.findById(costId),
    contextEngine.get({ type: "cost", id: costId }, new Date().toISOString()),
  ]);
  if (!cost) notFound();
  const today = new Date().toISOString().slice(0, 10);
  return (
    <main className="workspace-main module-main object-view object-view-cost">
      <Link className="back-link" href="/costs">
        ← Costs
      </Link>
      <div className="detail-heading object-hero cost-detail-hero">
        <div>
          <div className="cost-detail-kicker">
            <span className={`status-pill status-pill-${cost.status}`}>
              {COST_STATUS_LABELS[cost.status]}
            </span>
            <span>
              {COST_TYPE_LABELS[cost.costType]} · {COST_CATEGORY_LABELS[cost.category]}
            </span>
          </div>
          <h1 className="display">{cost.title}</h1>
          <p className="workspace-intro">{cost.description}</p>
        </div>
        <div className="detail-actions">
          {["planned", "active"].includes(cost.status) && (
            <Link className="button-secondary" href={`/costs/${cost.id}/edit`}>
              Editar
            </Link>
          )}
          {cost.status === "planned" && cost.costType === "recurring" && (
            <form action={activateCostAction.bind(null, cost.id)}>
              <button className="button-primary">Ativar</button>
            </form>
          )}
        </div>
      </div>

      <div className="cost-detail-content">
        <section className="cost-detail-amount">
          <span>{cost.status === "paid" ? "Valor real" : "Valor esperado"}</span>
          <strong>
            {money(cost.actualAmountMinor ?? cost.expectedAmountMinor, cost.currency)}
          </strong>
        </section>

        <dl className="cost-detail-facts">
          <Fact label="Calendário">
            {cost.costType === "one_off"
              ? date(cost.paidOn ?? cost.expectedOn!)
              : `${COST_RECURRENCE_LABELS[cost.recurrence!]} · desde ${date(cost.startsOn!)}`}
          </Fact>
          <Fact label="Owner">{cost.ownerDisplayName ?? "Sem owner"}</Fact>
          {cost.supplier ? <Fact label="Fornecedor">{cost.supplier}</Fact> : null}
          {cost.company ? (
            <Fact label="Organisation">
              <Link href={`/companies/${cost.company.id}`}>{cost.company.label}</Link>
            </Fact>
          ) : null}
          {cost.roadmapItem ? (
            <Fact label="Roadmap">
              <Link href={`/roadmap/${cost.roadmapItem.id}`}>{cost.roadmapItem.label}</Link>
            </Fact>
          ) : null}
          {cost.sourceDecision ? (
            <Fact label="Decision de origem">
              <Link href={`/decisions/${cost.sourceDecision.id}`}>{cost.sourceDecision.label}</Link>
            </Fact>
          ) : null}
          {cost.tasks.length ? (
            <Fact label="Tasks">
              {cost.tasks.map((task, index) => (
                <span key={task.id}>
                  <Link href={`/tasks/${task.id}`}>{task.label}</Link>
                  {index < cost.tasks.length - 1 ? " · " : ""}
                </span>
              ))}
            </Fact>
          ) : null}
        </dl>
      </div>

      {cost.status === "planned" && cost.costType === "one_off" && (
        <section className="cost-transition cost-action-panel">
          <h2>Confirmar pagamento</h2>
          <form action={payCostAction.bind(null, cost.id)}>
            <div className="field field-light">
              <label htmlFor="actual_amount">Valor real</label>
              <input
                defaultValue={(cost.expectedAmountMinor / 100).toFixed(2)}
                id="actual_amount"
                min=".01"
                name="actual_amount"
                required
                step=".01"
                type="number"
              />
            </div>
            <div className="field field-light">
              <label htmlFor="paid_on">Pago em</label>
              <input defaultValue={today} id="paid_on" name="paid_on" required type="date" />
            </div>
            <button className="button-primary">Marcar como pago</button>
          </form>
        </section>
      )}
      {cost.status === "active" && (
        <section className="cost-transition cost-action-panel">
          <h2>Terminar recorrência</h2>
          <form action={endCostAction.bind(null, cost.id)}>
            <div className="field field-light">
              <label htmlFor="ended_on">Terminado em</label>
              <input defaultValue={today} id="ended_on" name="ended_on" required type="date" />
            </div>
            <button className="button-secondary">Terminar Cost</button>
          </form>
        </section>
      )}
      {["planned", "active"].includes(cost.status) && (
        <ConfirmAction
          action={cancelCostTodayAction.bind(null, cost.id, today)}
          className="button-secondary"
          confirmation="Cancelar este Cost? O compromisso permanece no histórico e deixa de entrar nas projeções."
          pendingLabel="A cancelar…"
        >
          Cancelar Cost
        </ConfirmAction>
      )}
      <ContextPanel collapsible context={context} />
    </main>
  );
}
function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
function money(value: number, currency: string) {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency }).format(value / 100);
}
function date(value: string) {
  return new Intl.DateTimeFormat("pt-PT", { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(`${value.slice(0, 10)}T00:00:00Z`),
  );
}
