import Link from "next/link";

import { SPRINT_STATUS_LABELS, type SprintStatus } from "@/domain/sprints/sprint";
import { createSprintModule } from "@/foundation/composition/sprints";
import type { SprintListItem } from "@/projections/sprints/sprint-read-model";

const GROUPS: [SprintStatus, string][] = [
  ["active", "Sprint ativa"],
  ["planned", "Planeadas"],
  ["closed", "Histórico encerrado"],
  ["cancelled", "Canceladas"],
];

export default async function SprintsPage() {
  const { readModel } = await createSprintModule();
  const sprints = await readModel.list();
  return (
    <main className="workspace-main module-main">
      <div className="module-heading">
        <div>
          <h1 className="display">Sprints</h1>
          <p className="workspace-intro">Ciclos de compromisso.</p>
        </div>
        <Link className="button-primary" href="/sprints/new">
          New sprint
        </Link>
      </div>
      {sprints.length === 0 ? (
        <section className="empty-state">
          <p className="eyebrow">Empty</p>
          <h2 className="display">No sprints yet.</h2>
          <p>Cria um ciclo quando houver trabalho real a assumir.</p>
          <Link className="button-secondary" href="/sprints/new">
            New sprint
          </Link>
        </section>
      ) : (
        GROUPS.map(([status, title]) => {
          const items = sprints.filter((sprint) => sprint.status === status);
          return items.length ? (
            <SprintSection
              key={status}
              secondary={status === "closed" || status === "cancelled"}
              sprints={items}
              title={title}
            />
          ) : null;
        })
      )}
    </main>
  );
}

function SprintSection({
  title,
  sprints,
  secondary,
}: {
  title: string;
  sprints: SprintListItem[];
  secondary: boolean;
}) {
  return (
    <section className={`collection-section${secondary ? " collection-section-secondary" : ""}`}>
      <div className="collection-heading">
        <div>
          <p className="eyebrow">
            {sprints.length} {sprints.length === 1 ? "Sprint" : "Sprints"}
          </p>
          <h2 className="section-title">{title}</h2>
        </div>
        <p>Progresso calculado pelos estados atuais das Tasks comprometidas.</p>
      </div>
      <div className="collection-list collection-list-sprint">
        {sprints.map((sprint) => (
          <SprintRow key={sprint.id} sprint={sprint} />
        ))}
      </div>
    </section>
  );
}

function SprintRow({ sprint }: { sprint: SprintListItem }) {
  const progress =
    sprint.taskCount === 0 ? 0 : Math.round((sprint.completedTaskCount / sprint.taskCount) * 100);
  return (
    <Link className="collection-row collection-row-sprint" href={`/sprints/${sprint.id}`}>
      <div className="collection-primary">
        <span className={`status-pill status-pill-${sprint.status}`}>
          {SPRINT_STATUS_LABELS[sprint.status]}
        </span>
        <h2>{sprint.name}</h2>
        <p>{sprint.intendedResult}</p>
      </div>
      <div className="sprint-progress">
        <div className="sprint-progress-label">
          <span>
            {sprint.completedTaskCount}/{sprint.taskCount} concluídas
          </span>
          <strong>{progress}%</strong>
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
        {sprint.blockedTaskCount > 0 ? (
          <p className="collection-alert">{sprint.blockedTaskCount} bloqueada(s)</p>
        ) : null}
      </div>
      <div className="collection-meta">
        <span>
          <b>Owner</b>
          {sprint.ownerDisplayName}
        </span>
        <span>
          <b>Janela</b>
          {formatDate(sprint.startsOn)} — {formatDate(sprint.endsOn)}
        </span>
      </div>
    </Link>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(`${value}T00:00:00Z`),
  );
}
