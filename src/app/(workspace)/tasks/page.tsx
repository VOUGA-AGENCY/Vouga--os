import Link from "next/link";

import type { TaskStatus } from "@/domain/tasks/task";
import { createTaskModule } from "@/foundation/composition/tasks";
import type { TaskListItem } from "@/projections/tasks/task-read-model";

import { TaskStatusUpdate } from "./task-status-update";

const ACTIVE_GROUPS: ReadonlyArray<{
  status: TaskStatus;
  title: string;
}> = [
  { status: "blocked", title: "Blocked" },
  { status: "in_progress", title: "In progress" },
  { status: "todo", title: "Next" },
];

const HISTORY_GROUPS: typeof ACTIVE_GROUPS = [
  { status: "completed", title: "Completed" },
  { status: "cancelled", title: "Cancelled" },
];

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ history?: string; status?: string }>;
}) {
  const params = await searchParams;
  const { readModel } = await createTaskModule();
  const tasks = await readModel.list();
  const showHistory =
    params.history === "1" || ["completed", "cancelled"].includes(params.status ?? "");
  const groups = showHistory ? HISTORY_GROUPS : ACTIVE_GROUPS;
  const visibleTasks = tasks.filter((task) => groups.some((group) => group.status === task.status));
  const activeCount = tasks.filter((task) =>
    ["blocked", "in_progress", "todo"].includes(task.status),
  ).length;

  return (
    <main className="workspace-main module-main tasks-main">
      <div className="module-heading tasks-heading">
        <div>
          <h1 className="display">Tasks</h1>
          <p className="workspace-intro">Trabalho em curso.</p>
        </div>
        <div className="calendar-create-links">
          <Link className="button-secondary" href={showHistory ? "/tasks" : "/tasks?history=1"}>
            {showHistory ? "Open tasks" : "View completed"}
          </Link>
          <Link className="button-primary" href="/tasks/new">
            New task
          </Link>
        </div>
      </div>

      <div className="task-list-summary" aria-label="Resumo de Tasks">
        <span>{showHistory ? "History" : "Open"}</span>
        <strong>{showHistory ? visibleTasks.length : activeCount}</strong>
      </div>

      {visibleTasks.length ? (
        groups.map((group) => {
          const groupTasks = tasks.filter((task) => task.status === group.status);
          return groupTasks.length ? (
            <TaskSection
              key={group.status}
              secondary={showHistory}
              status={group.status}
              tasks={groupTasks}
              title={group.title}
            />
          ) : null;
        })
      ) : (
        <section className="empty-state empty-state-inline">
          <h2 className="display">{showHistory ? "No completed tasks." : "No open tasks."}</h2>
          <p>
            {showHistory
              ? "Completed and cancelled work will appear here."
              : "Create the first commitment when there is something real to move."}
          </p>
          <Link className="button-secondary" href={showHistory ? "/tasks" : "/tasks/new"}>
            {showHistory ? "Open tasks" : "New task"}
          </Link>
        </section>
      )}
    </main>
  );
}

function TaskSection({
  status,
  title,
  tasks,
  secondary,
}: {
  status: TaskStatus;
  title: string;
  tasks: TaskListItem[];
  secondary: boolean;
}) {
  return (
    <section className={`task-list-section${secondary ? " task-list-section-secondary" : ""}`}>
      <header className="task-list-section-heading">
        <h2>{title}</h2>
        <span>{tasks.length}</span>
      </header>
      <div className="task-list">
        {tasks.map((task) => (
          <TaskRow key={task.id} status={status} task={task} />
        ))}
      </div>
    </section>
  );
}

function TaskRow({ task, status }: { task: TaskListItem; status: TaskStatus }) {
  return (
    <article className={`task-list-row task-list-row-${status}`}>
      <span className="task-list-dot" aria-hidden="true" />
      <Link className="task-list-primary" href={`/tasks/${task.id}`}>
        <h2>{task.title}</h2>
        {status === "blocked" && task.blockedNextMove ? <p>{task.blockedNextMove}</p> : null}
      </Link>
      <div className="task-list-meta">
        <span>{task.ownerDisplayName}</span>
        {task.dueAt ? <time dateTime={task.dueAt}>{formatTaskDate(task.dueAt)}</time> : null}
        {status === "blocked" && task.blockedReason ? (
          <span className="task-list-alert">Blocked</span>
        ) : null}
      </div>
      <TaskStatusUpdate status={status} taskId={task.id} />
    </article>
  );
}

function formatTaskDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(
    new Date(value),
  );
}
