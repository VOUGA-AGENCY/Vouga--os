import Link from "next/link";
import { notFound } from "next/navigation";

import { getAuthenticatedUser } from "@/application/auth/current-user";
import { TASK_STATUS_LABELS } from "@/domain/tasks/task";
import { createContextEngine } from "@/foundation/composition/context-engine";
import { createTaskModule } from "@/foundation/composition/tasks";
import { returnLabel, safeWorkspaceReturnTo } from "@/foundation/navigation/return-to";
import { ConfirmAction } from "@/foundation/ui/confirm-action";
import { ContextPanel } from "../../context-panel";

import { cancelTaskAction, deleteTaskAction } from "../actions";

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
  const [{ readModel }, contextEngine, user] = await Promise.all([
    createTaskModule(),
    createContextEngine(),
    getAuthenticatedUser(),
  ]);
  const [task, context] = await Promise.all([
    readModel.findById(taskId),
    contextEngine.get({ type: "task", id: taskId }, new Date().toISOString(), user?.role ?? "engineer"),
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
              <Link className="button-primary" href={`/tasks/${task.id}/edit`}>
                Editar
              </Link>
              <ConfirmAction
                action={cancelTaskAction.bind(null, task.id)}
                className="button-secondary"
                confirmation="Cancelar esta Task? O compromisso fica terminal e não reabre automaticamente."
                pendingLabel="A cancelar…"
              >
                Cancelar Task
              </ConfirmAction>
            </>
          )}
          <ConfirmAction
            action={deleteTaskAction.bind(null, task.id)}
            className="button-danger"
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

      <ContextPanel collapsible context={context} exclude={["task-meetings"]} />
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
