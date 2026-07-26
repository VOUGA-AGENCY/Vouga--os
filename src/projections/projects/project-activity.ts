import { PROJECT_STATUS_LABELS } from "@/domain/projects/project";

import type { ProjectDetail } from "./project-read-model";

export type ProjectActivityItem = Readonly<{
  id: string;
  kind: "project" | "meeting" | "decision" | "task" | "milestone";
  title: string;
  meta: string | null;
  at: string;
  href: string | null;
}>;

export function composeProjectActivity(project: ProjectDetail, now: string): ProjectActivityItem[] {
  const items: ProjectActivityItem[] = [
    {
      id: `project-created:${project.id}`,
      kind: "project",
      title: "Project criado",
      meta: project.owner.displayName,
      at: project.createdAt,
      href: null,
    },
    ...project.statusChanges
      .filter((change) => change.fromStatus !== null)
      .map((change) => ({
        id: `project-status:${change.id}`,
        kind: "project" as const,
        title: `Estado alterado para ${PROJECT_STATUS_LABELS[change.toStatus]}`,
        meta: change.changedByDisplayName,
        at: change.changedAt,
        href: null,
      })),
    ...project.meetings.map((meeting) => ({
      id: `meeting:${meeting.id}`,
      kind: "meeting" as const,
      title: meeting.title,
      meta: meeting.kind === "meeting" ? "Meeting" : "Event",
      at: meeting.startsAt,
      href: `/meetings/${meeting.id}?returnTo=${encodeURIComponent(`/projects/${project.id}`)}`,
    })),
    ...project.decisions.map((decision) => ({
      id: `decision:${decision.id}`,
      kind: "decision" as const,
      title: decision.title,
      meta: "Decision",
      at: `${decision.decidedOn}T12:00:00.000Z`,
      href: `/decisions/${decision.id}`,
    })),
    ...project.tasks.flatMap((task) =>
      task.status === "completed" && task.completedAt
        ? [
            {
              id: `task:${task.id}`,
              kind: "task" as const,
              title: task.title,
              meta: `Concluída por ${task.ownerDisplayName}`,
              at: task.completedAt,
              href: `/tasks/${task.id}?returnTo=${encodeURIComponent(`/projects/${project.id}`)}`,
            },
          ]
        : [],
    ),
    ...project.milestones.flatMap((milestone) =>
      milestone.completedAt
        ? [
            {
              id: `milestone:${milestone.id}`,
              kind: "milestone" as const,
              title: milestone.title,
              meta: "Marco concluído",
              at: milestone.completedAt,
              href: null,
            },
          ]
        : [],
    ),
  ];

  return items
    .filter((item) => Date.parse(item.at) <= Date.parse(now))
    .sort((left, right) => right.at.localeCompare(left.at));
}
