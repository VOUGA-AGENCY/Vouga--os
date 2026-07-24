export const TASK_STATUSES = ["todo", "in_progress", "blocked", "completed", "cancelled"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export const TASK_PURPOSES = ["work", "relationship_follow_up"] as const;
export type TaskPurpose = (typeof TASK_PURPOSES)[number];
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "Por fazer",
  in_progress: "Em curso",
  blocked: "Bloqueada",
  completed: "Concluída",
  cancelled: "Cancelada",
};

export type GoogleEventOrigin = Readonly<{ memberId: string; calendarId: string; eventId: string }>;
export type TaskOrigin = Readonly<
  | { type: "planning"; meetingId: null; decisionId: null; directReason: null; googleEvent?: null }
  | { type: "meeting"; meetingId: string; decisionId: null; directReason: null; googleEvent?: null }
  | {
      type: "google_event";
      meetingId: null;
      decisionId: null;
      directReason: null;
      googleEvent: GoogleEventOrigin;
    }
  | {
      type: "decision";
      meetingId: null;
      decisionId: string;
      directReason: null;
      googleEvent?: null;
    }
  | { type: "direct"; meetingId: null; decisionId: null; directReason: string; googleEvent?: null }
>;
export type Task = Readonly<{
  id: string;
  title: string;
  expectedResult: string | null;
  purpose: TaskPurpose;
  status: TaskStatus;
  ownerMemberId: string;
  dueAt: string | null;
  blockedReason: string | null;
  blockedNextMove: string | null;
  completionNote: string | null;
  completedAt: string | null;
  origin: TaskOrigin;
  companyIds: readonly string[];
  meetingIds: readonly string[];
  createdAt: string;
  updatedAt: string;
}>;
export type TaskValues = {
  title: string;
  ownerMemberId: string;
  dueAt?: string | null;
  expectedResult?: string | null;
  purpose?: TaskPurpose;
  origin:
    | { type: "planning" }
    | { type: "meeting"; meetingId: string }
    | { type: "google_event"; memberId: string; calendarId: string; eventId: string }
    | { type: "decision"; decisionId: string }
    | { type: "direct"; directReason: string };
  companyIds?: readonly string[];
  meetingIds?: readonly string[];
};
export type ValidTaskValues = Readonly<{
  title: string;
  expectedResult: string | null;
  purpose: TaskPurpose;
  ownerMemberId: string;
  dueAt: string | null;
  origin: TaskOrigin;
  companyIds: readonly string[];
  meetingIds: readonly string[];
}>;
export class TaskValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TaskValidationError";
  }
}
export class TaskTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TaskTransitionError";
  }
}
function required(value: string, label: string, max: number) {
  const text = value.trim();
  if (!text) throw new TaskValidationError(`${label} é obrigatório.`);
  if (text.length > max)
    throw new TaskValidationError(`${label} não pode exceder ${max} caracteres.`);
  return text;
}
function optional(value: string | null | undefined, label: string, max: number) {
  const text = value?.trim() ?? "";
  if (!text) return null;
  if (text.length > max)
    throw new TaskValidationError(`${label} não pode exceder ${max} caracteres.`);
  return text;
}
function ids(values: readonly string[] = []) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
export function validateTaskValues(values: TaskValues): ValidTaskValues {
  const dueAt = values.dueAt ? new Date(values.dueAt) : null;
  if (dueAt && Number.isNaN(dueAt.getTime()))
    throw new TaskValidationError("A data limite não é válida.");
  const origin: TaskOrigin =
    values.origin.type === "planning"
      ? {
          type: "planning",
          meetingId: null,
          decisionId: null,
          directReason: null,
          googleEvent: null,
        }
      : values.origin.type === "meeting"
        ? {
            type: "meeting",
            meetingId: required(values.origin.meetingId, "A Meeting ou Event de origem", 100),
            decisionId: null,
            directReason: null,
            googleEvent: null,
          }
        : values.origin.type === "google_event"
          ? {
              type: "google_event",
              meetingId: null,
              decisionId: null,
              directReason: null,
              googleEvent: {
                memberId: required(values.origin.memberId, "O Member Google", 100),
                calendarId: required(values.origin.calendarId, "O Calendar Google", 1024),
                eventId: required(values.origin.eventId, "O evento Google", 1024),
              },
            }
          : values.origin.type === "decision"
            ? {
                type: "decision",
                meetingId: null,
                decisionId: required(values.origin.decisionId, "A Decision de origem", 100),
                directReason: null,
                googleEvent: null,
              }
            : {
                type: "direct",
                meetingId: null,
                decisionId: null,
                directReason: required(
                  values.origin.directReason,
                  "A razão da captura direta",
                  1000,
                ),
                googleEvent: null,
              };
  const meetingIds = ids(values.meetingIds);
  if (origin.type === "meeting" && !meetingIds.includes(origin.meetingId))
    meetingIds.push(origin.meetingId);
  const purpose = values.purpose ?? "work";
  if (!TASK_PURPOSES.includes(purpose))
    throw new TaskValidationError("O propósito da Task não é válido.");
  return {
    title: required(values.title, "O título", 160),
    expectedResult: optional(values.expectedResult, "O resultado esperado", 2000),
    purpose,
    ownerMemberId: required(values.ownerMemberId, "O owner", 100),
    dueAt: dueAt?.toISOString() ?? null,
    origin,
    companyIds: ids(values.companyIds),
    meetingIds,
  };
}
function active(task: Task) {
  if (task.status === "completed" || task.status === "cancelled")
    throw new TaskTransitionError("Esta Task já não aceita transições.");
}
export function startTask(task: Task): Task {
  active(task);
  if (task.status !== "todo")
    throw new TaskTransitionError("Apenas uma Task por fazer pode ser iniciada.");
  return { ...task, status: "in_progress" };
}
export function blockTask(task: Task, reason: string, nextMove: string): Task {
  active(task);
  if (task.status === "blocked") throw new TaskTransitionError("A Task já está bloqueada.");
  return {
    ...task,
    status: "blocked",
    blockedReason: required(reason, "A causa do bloqueio", 2000),
    blockedNextMove: required(nextMove, "O próximo movimento", 2000),
  };
}
export function unblockTask(task: Task): Task {
  active(task);
  if (task.status !== "blocked")
    throw new TaskTransitionError("Apenas uma Task bloqueada pode ser desbloqueada.");
  return { ...task, status: "in_progress", blockedReason: null, blockedNextMove: null };
}
export function completeTask(task: Task, completedAt: string, note: string): Task {
  active(task);
  const instant = new Date(completedAt);
  if (Number.isNaN(instant.getTime()))
    throw new TaskValidationError("O momento de conclusão não é válido.");
  return {
    ...task,
    status: "completed",
    blockedReason: null,
    blockedNextMove: null,
    completionNote: required(note, "A evidência da conclusão", 4000),
    completedAt: instant.toISOString(),
  };
}
export function cancelTask(task: Task): Task {
  active(task);
  return {
    ...task,
    status: "cancelled",
    blockedReason: null,
    blockedNextMove: null,
    completionNote: null,
    completedAt: null,
  };
}
