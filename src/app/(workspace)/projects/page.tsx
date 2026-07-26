import Link from "next/link";

import { PROJECT_STATUS_LABELS, type ProjectStatus } from "@/domain/projects/project";
import { createProjectModule } from "@/foundation/composition/projects";
import type { ProjectListItem } from "@/projections/projects/project-read-model";

const ACTIVE: readonly ProjectStatus[] = [
  "in_progress",
  "waiting_client",
  "not_started",
  "delivered",
];

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ history?: string }>;
}) {
  const { history } = await searchParams;
  const showClosed = history === "1";
  const { readModel } = await createProjectModule();
  const projects = await readModel.list();
  const visible = projects.filter((project) =>
    showClosed ? project.status === "closed" : ACTIVE.includes(project.status),
  );

  return (
    <main className="workspace-main module-main projects-main">
      <div className="module-heading projects-heading">
        <div>
          <h1 className="display">Projects</h1>
          <p className="workspace-intro">Entregas a clientes.</p>
        </div>
        <div className="calendar-create-links">
          <Link
            className="button-secondary"
            href={showClosed ? "/projects" : "/projects?history=1"}
          >
            {showClosed ? "Projects ativos" : "Ver encerrados"}
          </Link>
          <Link className="button-primary" href="/projects/new">
            Novo Project
          </Link>
        </div>
      </div>

      <div className="project-list-summary">
        <span>{showClosed ? "Encerrados" : "Ativos"}</span>
        <strong>{visible.length}</strong>
      </div>

      {visible.length ? (
        <section className="project-list" aria-label="Lista de Projects">
          {visible.map((project) => (
            <ProjectRow key={project.id} project={project} />
          ))}
        </section>
      ) : (
        <section className="empty-state empty-state-inline">
          <h2 className="display">
            {showClosed ? "Sem Projects encerrados." : "Ainda não há Projects."}
          </h2>
          <p>
            {showClosed
              ? "Os Projects encerrados ficam disponíveis aqui."
              : "Cria um Project quando uma entrega com cliente estiver acordada."}
          </p>
          <Link className="button-secondary" href={showClosed ? "/projects" : "/projects/new"}>
            {showClosed ? "Projects ativos" : "Novo Project"}
          </Link>
        </section>
      )}
    </main>
  );
}

function ProjectRow({ project }: { project: ProjectListItem }) {
  return (
    <article className="project-list-row">
      <Link className="project-list-primary" href={`/projects/${project.id}`}>
        <h2>{project.name}</h2>
        <p>
          {project.client.name} · {PROJECT_STATUS_LABELS[project.status]} ·{" "}
          {project.owner.displayName}
        </p>
      </Link>
      <div className="project-list-next">
        <span>Próxima ação</span>
        <strong>{project.nextTask?.title ?? "Por definir"}</strong>
      </div>
      <div className="project-list-date">
        <span>Entrega</span>
        <time dateTime={project.targetDeliveryOn}>{date(project.targetDeliveryOn)}</time>
      </div>
    </article>
  );
}

function date(value: string) {
  return new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "short" }).format(
    new Date(`${value}T12:00:00Z`),
  );
}
