import Link from "next/link";
import { notFound } from "next/navigation";

import { TASK_STATUS_LABELS } from "@/domain/tasks/task";
import { createContextEngine } from "@/foundation/composition/context-engine";
import { createTaskModule } from "@/foundation/composition/tasks";
import { returnLabel, safeWorkspaceReturnTo } from "@/foundation/navigation/return-to";
import { ConfirmAction } from "@/foundation/ui/confirm-action";
import { ContextPanel } from "../../context-panel";

import {
  blockTaskAction,
  cancelTaskAction,
  completeTaskAction,
  startTaskAction,
  unblockTaskAction,
  deleteTaskAction,
} from "../actions";

export default async function TaskDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ taskId: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { taskId } = await params;
  const { returnTo } = await searchParams;
  const backHref = safeWorkspaceReturnTo(returnTo, "/tasks");
  const backLabel = returnLabel(backHref, "Tasks");
  const [{ readModel }, contextEngine] = await Promise.all([
    createTaskModule(),
    createContextEngine(),
  ]);
  const [task, context] = await Promise.all([
    readModel.findById(taskId),
    contextEngine.get({ type: "task", id: taskId }, new Date().toISOString()),
  ]);
  if (!task) notFound();

  const terminal = task.status === "completed" || task.status === "cancelled";

  return (
    <main className="workspace-main module-main object-view object-view-task">
      <Link className="back-link" href={backHref}>
        ← {backLabel}
      </Link>
      <div className="detail-heading object-hero">
        <div>
          <span className={`status-pill status-pill-${task.status}`}>
            {TASK_STATUS_LABELS[task.status]}
          </span>
          <h1 className="display">{task.title}</h1>
        </div>
        <div className="detail-actions">
          {!terminal && (
            <>
              <Link className="button-secondary" href={`/tasks/${task.id}/edit`}>
                Editar
              </Link>
              {task.status === "todo" && (
                <form action={startTaskAction.bind(null, task.id)}>
                  <button className="button-primary">Iniciar</button>
                </form>
              )}
              {task.status === "blocked" && (
                <form action={unblockTaskAction.bind(null, task.id)}>
                  <button className="button-primary">Desbloquear</button>
                </form>
              )}
              <ConfirmAction
                action={cancelTaskAction.bind(null, task.id)}
                confirmation="Cancelar esta Task? O compromisso fica terminal e não reabre automaticamente."
                pendingLabel="A cancelar…"
              >
                Cancelar Task
              </ConfirmAction>
            </>
          )}
          <ConfirmAction
            action={deleteTaskAction.bind(null, task.id)}
            confirmation="Eliminar definitivamente esta Task? Não ficará histórico no Vouga OS."
            pendingLabel="A eliminar…"
          >
            Eliminar
          </ConfirmAction>
        </div>
      </div>

      <div className="detail-grid task-facts-grid">
        <Card className="task-owner-card" label="Owner">
          <p>{task.ownerDisplayName}</p>
        </Card>
        <Card className="task-origin-card" label="Origem">
          <p>{task.originLabel}</p>
        </Card>
        <Card className="task-due-card" label="Data limite">
          <p className={task.dueAt ? "" : "muted-copy"}>
            {task.dueAt ? format(task.dueAt) : "Sem prazo definido."}
          </p>
        </Card>
        {task.status === "blocked" && (
          <>
            <Card className="task-blocker-card" label="Causa do bloqueio">
              <p>{task.blockedReason}</p>
            </Card>
            <Card className="task-next-move-card" label="Próximo movimento">
              <p>{task.blockedNextMove}</p>
            </Card>
          </>
        )}
        {task.status === "completed" && (
          <Card className="task-completion-card" label="Conclusão" wide>
            <p>{task.completionNote ?? "Concluída sem nota adicional."}</p>
            <p className="muted-copy">{task.completedAt && format(task.completedAt)}</p>
          </Card>
        )}
      </div>

      <ContextPanel context={context} exclude={["task-meetings"]} />

      {!terminal && (
        <section aria-labelledby="task-next-actions" className="task-actions-section">
          <div className="archive-heading">
            <p className="eyebrow">Próximo movimento</p>
            <h2 className="display section-title" id="task-next-actions">
              Atualizar o estado do compromisso
            </h2>
          </div>
          <div className="task-transition-grid">
            <form
              action={blockTaskAction.bind(null, task.id)}
              className="detail-card task-action-card task-action-block"
            >
              <p className="eyebrow">Bloquear</p>
              <div className="field field-light">
                <label htmlFor="blocked_reason">Causa</label>
                <textarea
                  id="blocked_reason"
                  name="blocked_reason"
                  placeholder="Ex.: Aguardar validação jurídica."
                  required
                  rows={3}
                />
              </div>
              <div className="field field-light">
                <label htmlFor="blocked_next_move">Próximo movimento</label>
                <textarea
                  id="blocked_next_move"
                  name="blocked_next_move"
                  placeholder="Ex.: Pedir resposta até sexta-feira."
                  required
                  rows={3}
                />
              </div>
              <button className="button-secondary">Marcar bloqueada</button>
            </form>
            <form
              action={completeTaskAction.bind(null, task.id)}
              className="detail-card task-action-card task-action-complete"
            >
              <p className="eyebrow">Concluir</p>
              <div className="field field-light">
                <label htmlFor="completion_note">Evidência opcional</label>
                <textarea
                  id="completion_note"
                  name="completion_note"
                  placeholder="Ex.: Proposta enviada por email e receção confirmada."
                  rows={4}
                />
              </div>
              <button className="button-primary">Concluir Task</button>
            </form>
          </div>
        </section>
      )}
    </main>
  );
}

function Card({
  children,
  className = "",
  label,
  wide = false,
}: {
  children: React.ReactNode;
  className?: string;
  label: string;
  wide?: boolean;
}) {
  return (
    <section className={`detail-card${wide ? " detail-card-wide" : ""} ${className}`}>
      <p className="eyebrow">{label}</p>
      {children}
    </section>
  );
}

function format(value: string) {
  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Lisbon",
  }).format(new Date(value));
}
