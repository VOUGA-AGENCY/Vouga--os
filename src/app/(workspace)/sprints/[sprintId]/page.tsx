import Link from "next/link";
import { notFound } from "next/navigation";

import { SPRINT_CLOSURE_DISPOSITION_LABELS, SPRINT_STATUS_LABELS } from "@/domain/sprints/sprint";
import { TASK_STATUS_LABELS } from "@/domain/tasks/task";
import { createContextEngine } from "@/foundation/composition/context-engine";
import { createSprintModule } from "@/foundation/composition/sprints";
import { returnLabel, safeWorkspaceReturnTo } from "@/foundation/navigation/return-to";
import { ConfirmAction } from "@/foundation/ui/confirm-action";
import { ContextPanel } from "../../context-panel";

import {
  activateSprintAction,
  addSprintTasksAction,
  cancelSprintAction,
  removeSprintTaskAction,
} from "../actions";

export default async function SprintDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ sprintId: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { sprintId } = await params;
  const { returnTo } = await searchParams;
  const backHref = safeWorkspaceReturnTo(returnTo, "/sprints");
  const backLabel = returnLabel(backHref, "Sprints");
  const [{ readModel, service }, contextEngine] = await Promise.all([
    createSprintModule(),
    createContextEngine(),
  ]);
  const [sprint, options, context] = await Promise.all([
    readModel.findById(sprintId),
    service.getFormOptions(),
    contextEngine.get({ type: "sprint", id: sprintId }, new Date().toISOString()),
  ]);
  if (!sprint) notFound();

  const existing = new Set(sprint.tasks.map((task) => task.taskId));
  const available = options.tasks.filter((task) => !existing.has(task.id));
  const terminal = sprint.status === "closed" || sprint.status === "cancelled";
  const progress =
    sprint.taskCount === 0 ? 0 : Math.round((sprint.completedTaskCount / sprint.taskCount) * 100);

  return (
    <main className="workspace-main module-main object-view object-view-sprint">
      <Link className="back-link" href={backHref}>
        ← {backLabel}
      </Link>
      <div className="sprint-commitment-hero">
        <div className="sprint-commitment-main">
          <div className="sprint-commitment-kicker">
            <span className={`status-pill status-pill-${sprint.status}`}>
              {SPRINT_STATUS_LABELS[sprint.status]}
            </span>
            <span>
              {formatDate(sprint.startsOn)} — {formatDate(sprint.endsOn)}
            </span>
          </div>
          <h1>{sprint.name}</h1>
          <p>{sprint.intendedResult}</p>
          <div className="sprint-commitment-progress">
            <div>
              <strong>{progress}%</strong>
              <span>
                {sprint.completedTaskCount}/{sprint.taskCount} Tasks concluídas
                {sprint.blockedTaskCount ? ` · ${sprint.blockedTaskCount} bloqueadas` : ""}
              </span>
            </div>
            <div
              aria-label={`${progress}% do compromisso concluído`}
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={progress}
              className="sprint-progress-track"
              role="progressbar"
            >
              <span style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
        <dl className="sprint-commitment-facts">
          <div>
            <dt>Owner</dt>
            <dd>{sprint.ownerDisplayName}</dd>
          </div>
          <div>
            <dt>Período</dt>
            <dd>
              {formatDate(sprint.startsOn)} — {formatDate(sprint.endsOn)}
            </dd>
          </div>
          <div>
            <dt>Riscos</dt>
            <dd>{sprint.materialRisks ?? "Sem riscos materiais registados."}</dd>
          </div>
          {sprint.status === "closed" && (
            <>
              <div>
                <dt>Resultado</dt>
                <dd>{sprint.actualResult}</dd>
              </div>
              <div>
                <dt>Aprendizagem</dt>
                <dd>{sprint.learning}</dd>
              </div>
            </>
          )}
        </dl>
        {!terminal && (
          <div className="detail-actions sprint-commitment-actions">
            {sprint.status === "planned" && (
              <form action={activateSprintAction.bind(null, sprint.id)}>
                <button className="button-primary">Start sprint</button>
              </form>
            )}
            {sprint.status === "active" && (
              <Link className="button-primary" href={`/sprints/${sprint.id}/close`}>
                Close sprint
              </Link>
            )}
            <ConfirmAction
              action={cancelSprintAction.bind(null, sprint.id)}
              confirmation="Cancelar esta Sprint? O ciclo fica terminal e os compromissos históricos são preservados."
              pendingLabel="A cancelar…"
            >
              Cancelar Sprint
            </ConfirmAction>
          </div>
        )}
      </div>

      <section className="meeting-section sprint-commitments-section">
        <div className="archive-heading">
          <p className="eyebrow">
            {sprint.tasks.length} {sprint.tasks.length === 1 ? "compromisso" : "compromissos"}
          </p>
          <h2 className="display section-title">Compromisso assumido</h2>
        </div>
        {sprint.tasks.length === 0 ? (
          <p className="muted-copy">Ainda não existem Tasks assumidas neste ciclo.</p>
        ) : (
          <div className="operational-table-wrap">
            <table className="operational-table sprint-commitment-table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Estado</th>
                  <th>Owner</th>
                  <th>Deadline</th>
                  <th>Bloqueio</th>
                  <th>Compromisso</th>
                  {sprint.status === "planned" ? <th>Ação</th> : null}
                </tr>
              </thead>
              <tbody>
                {sprint.tasks.map((task) => (
                  <tr key={task.taskId}>
                    <td>
                      <Link className="table-primary-link" href={`/tasks/${task.taskId}`}>
                        {task.title}
                      </Link>
                      {task.expectedResult ? <small>{task.expectedResult}</small> : null}
                    </td>
                    <td>
                      <span className={`status-pill status-pill-${task.status}`}>
                        {TASK_STATUS_LABELS[task.status]}
                      </span>
                    </td>
                    <td>{task.ownerDisplayName}</td>
                    <td>
                      {task.dueAt ? (
                        <time dateTime={task.dueAt}>{formatInstant(task.dueAt)}</time>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      {task.status === "blocked"
                        ? (task.blockedNextMove ?? task.blockedReason ?? "Bloqueada")
                        : "—"}
                    </td>
                    <td>
                      {task.closureDisposition
                        ? SPRINT_CLOSURE_DISPOSITION_LABELS[task.closureDisposition]
                        : formatInstant(task.committedAt)}
                    </td>
                    {sprint.status === "planned" ? (
                      <td>
                        <ConfirmAction
                          action={removeSprintTaskAction.bind(null, sprint.id, task.taskId)}
                          className="button-tertiary button-compact"
                          confirmation={`Remover “${task.title}” deste compromisso planeado? A Task não será apagada.`}
                          pendingLabel="A remover…"
                        >
                          Remover
                        </ConfirmAction>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ContextPanel collapsible context={context} exclude={["sprint-tasks"]} />

      {!terminal && available.length > 0 && (
        <section className="detail-card sprint-add-card">
          <p className="eyebrow">
            {sprint.status === "active"
              ? "Inclusão urgente explícita"
              : "Alterar compromisso planeado"}
          </p>
          <h2>Adicionar Tasks existentes</h2>
          <form action={addSprintTasksAction.bind(null, sprint.id)}>
            <div className="choice-grid">
              {available.map((task) => (
                <label className="choice-option" key={task.id}>
                  <input name="task_id" type="checkbox" value={task.id} />
                  <span>
                    {task.title}
                    <small>{task.ownerDisplayName}</small>
                  </span>
                </label>
              ))}
            </div>
            <button className="button-secondary">Adicionar ao compromisso</button>
          </form>
        </section>
      )}
    </main>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function formatInstant(value: string) {
  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Lisbon",
  }).format(new Date(value));
}
