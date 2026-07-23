export const MEETING_STATUSES = ["planned", "needs_closure", "closed", "cancelled"] as const;
export type MeetingStatus = (typeof MEETING_STATUSES)[number];

export const MEETING_KINDS = ["meeting", "event", "vacation"] as const;
export type MeetingKind = (typeof MEETING_KINDS)[number];

export const VACATION_TONES = ["orange", "blue", "green", "purple", "pink", "red"] as const;
export type VacationTone = (typeof VACATION_TONES)[number];

export const MEETING_STATUS_LABELS: Record<MeetingStatus, string> = {
  planned: "Planeada",
  needs_closure: "Sem output",
  closed: "Fechada",
  cancelled: "Cancelada",
};
export const MEETING_KIND_LABELS: Record<MeetingKind, string> = {
  meeting: "Meeting",
  event: "Event",
  vacation: "Vacation",
};

export type MeetingParticipant = Readonly<{
  memberId: string | null;
  contactId: string | null;
  externalName: string | null;
}>;

export type Meeting = Readonly<{
  id: string;
  kind: MeetingKind;
  calendarTone: VacationTone | null;
  title: string;
  purpose: string | null;
  intendedResult: string | null;
  status: MeetingStatus;
  closerMemberId: string | null;
  startsAt: string;
  endsAt: string;
  agenda: string | null;
  notes: string | null;
  openQuestions: string | null;
  conclusion: string | null;
  closedAt: string | null;
  participants: readonly MeetingParticipant[];
  companyIds: readonly string[];
  taskIds?: readonly string[];
  createdAt: string;
  updatedAt: string;
}>;

export type MeetingValues = {
  kind?: MeetingKind | string | null;
  calendarTone?: VacationTone | string | null;
  title?: string | null;
  startsAt: string;
  endsAt: string;
  notes?: string | null;
  participantMemberIds?: readonly string[];
  companyIds?: readonly string[];
  taskIds?: readonly string[];
  /** Legacy input fields are accepted only so old callers can be migrated without copying them. */
  purpose?: string | null;
  intendedResult?: string | null;
  closerMemberId?: string | null;
  agenda?: string | null;
  openQuestions?: string | null;
  participants?: readonly Readonly<{
    memberId?: string | null;
    contactId?: string | null;
    externalName?: string | null;
  }>[];
};

export type ValidMeetingValues = Readonly<{
  kind: MeetingKind;
  calendarTone: VacationTone | null;
  title: string;
  purpose: null;
  intendedResult: null;
  closerMemberId: null;
  startsAt: string;
  endsAt: string;
  agenda: null;
  notes: string | null;
  openQuestions: null;
  participants: readonly MeetingParticipant[];
  companyIds: readonly string[];
  taskIds: readonly string[];
}>;

export class MeetingValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MeetingValidationError";
  }
}
export class MeetingTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MeetingTransitionError";
  }
}

function requiredText(value: string, label: string, maximum: number) {
  const normalized = value.trim();
  if (!normalized) throw new MeetingValidationError(`${label} é obrigatório.`);
  if (normalized.length > maximum)
    throw new MeetingValidationError(`${label} não pode exceder ${maximum} caracteres.`);
  return normalized;
}
function optionalText(value: string | null | undefined, label: string, maximum: number) {
  const normalized = value?.trim() ?? "";
  if (!normalized) return null;
  if (normalized.length > maximum)
    throw new MeetingValidationError(`${label} não pode exceder ${maximum} caracteres.`);
  return normalized;
}
function validInstant(value: string, label: string) {
  const time = Date.parse(value);
  if (!value || Number.isNaN(time)) throw new MeetingValidationError(`${label} não é válido.`);
  return new Date(time).toISOString();
}
function uniqueIds(values: readonly string[] | undefined) {
  return [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))];
}
function validKind(value: MeetingValues["kind"]): MeetingKind {
  if (!value) return "meeting";
  if (MEETING_KINDS.includes(value as MeetingKind)) return value as MeetingKind;
  throw new MeetingValidationError("O tipo não é válido.");
}

function validVacationTone(value: MeetingValues["calendarTone"]): VacationTone {
  if (value && VACATION_TONES.includes(value as VacationTone)) return value as VacationTone;
  throw new MeetingValidationError("Escolhe uma cor para a Vacation.");
}

export function validateMeetingValues(values: MeetingValues): ValidMeetingValues {
  const kind = validKind(values.kind);
  const startsAt = validInstant(values.startsAt, "O início");
  const endsAt = validInstant(values.endsAt, "O fim");
  if (Date.parse(endsAt) <= Date.parse(startsAt)) {
    throw new MeetingValidationError("O fim tem de ser posterior ao início.");
  }
  const participantMemberIds = uniqueIds(
    values.participantMemberIds ??
      values.participants?.flatMap((item) => (item.memberId ? [item.memberId] : [])),
  );
  if (kind === "meeting" && participantMemberIds.length === 0) {
    throw new MeetingValidationError("Seleciona pelo menos um participante para a Meeting.");
  }
  if (kind === "vacation" && participantMemberIds.length !== 1) {
    throw new MeetingValidationError("Seleciona uma pessoa para a Vacation.");
  }
  const isVacation = kind === "vacation";
  return {
    kind,
    calendarTone: isVacation ? validVacationTone(values.calendarTone) : null,
    title: requiredText(
      isVacation ? (values.title ?? "Vacation") : (values.title ?? ""),
      "O título",
      160,
    ),
    purpose: null,
    intendedResult: null,
    closerMemberId: null,
    startsAt,
    endsAt,
    agenda: null,
    notes: isVacation ? null : optionalText(values.notes, "As notas", 12000),
    openQuestions: null,
    participants: participantMemberIds.map((memberId) => ({
      memberId,
      contactId: null,
      externalName: null,
    })),
    companyIds: isVacation ? [] : uniqueIds(values.companyIds),
    taskIds: isVacation ? [] : uniqueIds(values.taskIds),
  };
}

export function effectiveMeetingStatus(
  meeting: Pick<Meeting, "kind" | "status" | "endsAt">,
  now: string,
): MeetingStatus {
  if (meeting.status === "planned" && Date.parse(meeting.endsAt) < Date.parse(now)) {
    return meeting.kind === "meeting" ? "needs_closure" : "closed";
  }
  return meeting.status;
}
export function cancelMeeting(meeting: Meeting): Meeting {
  if (meeting.status === "closed" || meeting.status === "cancelled")
    throw new MeetingTransitionError("Esta Meeting já não pode ser cancelada.");
  return { ...meeting, status: "cancelled", closedAt: null };
}
export function closeMeeting(meeting: Meeting, conclusion: string, closedAt: string): Meeting {
  if (meeting.kind !== "meeting")
    throw new MeetingTransitionError("Este tipo termina automaticamente e não aceita output.");
  if (meeting.status === "closed" || meeting.status === "cancelled")
    throw new MeetingTransitionError("Esta Meeting já não pode ser fechada.");
  return {
    ...meeting,
    status: "closed",
    conclusion: requiredText(conclusion, "O output", 4000),
    closedAt: validInstant(closedAt, "O momento de fecho"),
  };
}
