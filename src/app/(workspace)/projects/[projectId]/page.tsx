import Link from "next/link";
import { notFound } from "next/navigation";

import { PROJECT_STATUS_LABELS } from "@/domain/projects/project";
import { createProjectModule } from "@/foundation/composition/projects";
import { composeProjectActivity } from "@/projections/projects/project-activity";
import { projectFinancialSummary } from "@/projections/projects/project-finance";
import type {
  ProjectMeetingItem,
  ProjectTaskItem,
} from "@/projections/projects/project-read-model";

import { ProjectStatusUpdate } from "../project-status-update";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { readModel } = await createProjectModule();
  const project = await readModel.findById(projectId);
  if (!project) notFound();

  const now = new Date().toISOString();
  const activity = composeProjectActivity(project, now);
  const finance = projectFinancialSummary(project);
  const nextMeeting = project.meetings.find((meeting) => meeting.startsAt >= now) ?? null;
  const lastMeeting =
    [...project.meetings].reverse().find((meeting) => meeting.startsAt < now) ?? null;
  return (
    <main className="workspace-main module-main object-view project-view">
      <Link className="back-link" href="/projects">
        ← Projects
      </Link>
      <header className="project-hero">
        <div>
          <span className={`status-pill status-pill-${project.status}`}>
            {PROJECT_STATUS_LABELS[project.status]}
          </span>
          <h1 className="display">{project.name}</h1>
          <p>{project.client.name}</p>
        </div>
        <div className="detail-actions">
          <ProjectStatusUpdate projectId={project.id} status={project.status} />
          {project.status !== "closed" ? (
            <Link className="button-primary" href={`/projects/${project.id}/edit`}>
              Editar
            </Link>
          ) : null}
        </div>
      </header>

      <section className="project-facts" aria-label="Informação essencial">
        <Fact label="Cliente" value={project.client.name} />
        <Fact label="Responsável" value={project.owner.displayName} />
        <Fact
          label="Datas"
          value={`${date(project.startsOn)} — ${date(project.targetDeliveryOn)}`}
        />
        <Fact label="Valor acordado" value={money(project.agreedAmountMinor, project.currency)} />
      </section>

      <div className="project-detail-layout">
        <div className="project-detail-main">
          <Section title="Objetivo">
            <p className="project-prose">{project.objective}</p>
            <h3>Resultado esperado</h3>
            <p className="project-prose">{project.expectedResult}</p>
          </Section>

          <Section title="Âmbito">
            <Checklist
              empty="O âmbito ainda não foi detalhado."
              items={project.scopeItems
                .filter((item) => item.kind === "in_scope")
                .map((item) => item.label)}
            />
            {project.scopeItems.some((item) => item.kind === "out_of_scope") ? (
              <>
                <h3>Fora do âmbito</h3>
                <Checklist
                  items={project.scopeItems
                    .filter((item) => item.kind === "out_of_scope")
                    .map((item) => item.label)}
                  muted
                />
              </>
            ) : null}
          </Section>

          <Section title="Marcos">
            {project.milestones.length ? (
              <ul className="project-milestones">
                {project.milestones.map((milestone) => (
                  <li className={milestone.completedAt ? "completed" : ""} key={milestone.id}>
                    <span aria-hidden="true">{milestone.completedAt ? "✓" : "○"}</span>
                    <strong>{milestone.title}</strong>
                    {milestone.completedAt ? <time>{shortDate(milestone.completedAt)}</time> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="project-empty">Sem marcos definidos.</p>
            )}
          </Section>

          <Section title="Tasks">
            {project.tasks.length ? (
              <div className="project-linked-list">
                {project.tasks.map((task) => (
                  <TaskRow key={task.id} projectId={project.id} task={task} />
                ))}
              </div>
            ) : (
              <p className="project-empty">Sem Tasks associadas.</p>
            )}
          </Section>

          <Section title="Atividade">
            {activity.length ? (
              <ol className="project-activity">
                {activity.map((item) => (
                  <li key={item.id}>
                    <time>{shortDate(item.at)}</time>
                    <div>
                      {item.href ? (
                        <Link href={item.href}>{item.title}</Link>
                      ) : (
                        <strong>{item.title}</strong>
                      )}
                      {item.meta ? <span>{item.meta}</span> : null}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="project-empty">A atividade aparece automaticamente.</p>
            )}
          </Section>
        </div>

        <aside className="project-detail-aside">
          <Section title="Próxima ação" priority>
            {project.nextTask ? (
              <TaskRow projectId={project.id} task={project.nextTask} />
            ) : (
              <p className="project-empty">Por definir.</p>
            )}
          </Section>

          <Section title="Pessoas">
            <People title="Equipa Vouga" values={project.team} />
            <People title="Cliente" values={project.contacts} />
          </Section>

          <Section title="Reuniões">
            <Meeting label="Próxima" meeting={nextMeeting} projectId={project.id} />
            <Meeting label="Última" meeting={lastMeeting} projectId={project.id} />
            {project.meetings.length ? (
              <p className="project-section-link">{project.meetings.length} associadas</p>
            ) : null}
          </Section>

          <Section title="Financeiro">
            <dl className="project-finance">
              <div>
                <dt>Projeto</dt>
                <dd>{money(finance.agreedAmountMinor, finance.currency)}</dd>
              </div>
              <div>
                <dt>Recebido</dt>
                <dd>{money(finance.receivedAmountMinor, finance.currency)}</dd>
              </div>
              <div>
                <dt>Por receber</dt>
                <dd>{money(finance.receivableAmountMinor, finance.currency)}</dd>
              </div>
              {finance.externalCosts.map((total) => (
                <div key={total.currency}>
                  <dt>Custos externos</dt>
                  <dd>{money(total.amountMinor, total.currency)}</dd>
                </div>
              ))}
            </dl>
          </Section>

          <Section title="Recursos">
            {project.resources.length ? (
              <ul className="project-resources">
                {project.resources.map((resource) => (
                  <li key={resource.id}>
                    <a href={resource.url} rel="noreferrer" target="_blank">
                      {resource.title}
                    </a>
                    {resource.kind ? <span>{resource.kind}</span> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="project-empty">Sem recursos associados.</p>
            )}
          </Section>
        </aside>
      </div>
    </main>
  );
}

function Section({
  children,
  priority,
  title,
}: {
  children: React.ReactNode;
  priority?: boolean;
  title: string;
}) {
  return (
    <section className={`project-section${priority ? " project-section-priority" : ""}`}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Checklist({
  empty,
  items,
  muted,
}: {
  empty?: string;
  items: readonly string[];
  muted?: boolean;
}) {
  if (!items.length) return <p className="project-empty">{empty}</p>;
  return (
    <ul className={`project-checklist${muted ? " muted" : ""}`}>
      {items.map((item) => (
        <li key={item}>
          <span aria-hidden="true">{muted ? "—" : "✓"}</span>
          {item}
        </li>
      ))}
    </ul>
  );
}

function TaskRow({ projectId, task }: { projectId: string; task: ProjectTaskItem }) {
  return (
    <Link
      className="project-linked-row"
      href={`/tasks/${task.id}?returnTo=${encodeURIComponent(`/projects/${projectId}`)}`}
    >
      <span>
        <strong>{task.title}</strong>
        <small>{task.ownerDisplayName}</small>
      </span>
      <time>{task.dueAt ? shortDate(task.dueAt) : "Sem prazo"}</time>
    </Link>
  );
}

function People({
  title,
  values,
}: {
  title: string;
  values: readonly { id: string; displayName: string; meta: string | null }[];
}) {
  return (
    <div className="project-people">
      <h3>{title}</h3>
      {values.length ? (
        values.map((person) => (
          <p key={person.id}>
            <strong>{person.displayName}</strong>
            {person.meta ? <span>{person.meta}</span> : null}
          </p>
        ))
      ) : (
        <p className="project-empty">Sem pessoas associadas.</p>
      )}
    </div>
  );
}

function Meeting({
  label,
  meeting,
  projectId,
}: {
  label: string;
  meeting: ProjectMeetingItem | null;
  projectId: string;
}) {
  return (
    <div className="project-meeting">
      <span>{label}</span>
      {meeting ? (
        <Link
          href={`/meetings/${meeting.id}?returnTo=${encodeURIComponent(`/projects/${projectId}`)}`}
        >
          <strong>{meeting.title}</strong>
          <time>{shortDate(meeting.startsAt)}</time>
        </Link>
      ) : (
        <p>Sem registo.</p>
      )}
    </div>
  );
}

function money(value: number, currency: string) {
  return new Intl.NumberFormat("pt-PT", { currency, style: "currency" }).format(value / 100);
}

function date(value: string) {
  return new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium" }).format(
    new Date(`${value}T12:00:00Z`),
  );
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("pt-PT", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
