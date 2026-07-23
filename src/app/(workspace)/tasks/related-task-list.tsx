import Link from "next/link";
import { TASK_STATUS_LABELS } from "@/domain/tasks/task";
import type { TaskListItem } from "@/projections/tasks/task-read-model";
export function RelatedTaskList({ tasks }: { tasks: TaskListItem[] }) {
  return (
    <section className="detail-card detail-card-wide">
      <p className="eyebrow">Tasks relacionadas</p>
      {tasks.length === 0 ? (
        <p className="muted-copy">Sem Tasks relacionadas.</p>
      ) : (
        <ul className="plain-list">
          {tasks.map((t) => (
            <li key={t.id}>
              <Link href={`/tasks/${t.id}`}>{t.title}</Link>
              <span>
                {TASK_STATUS_LABELS[t.status]} · {t.ownerDisplayName}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
