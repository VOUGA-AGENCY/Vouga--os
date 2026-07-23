export const GOOGLE_EVENT_CLASSIFICATIONS = ["meeting", "event"] as const;
export type GoogleEventClassification = (typeof GOOGLE_EVENT_CLASSIFICATIONS)[number];

export type GoogleEventArtifact = Readonly<{
  memberId: string;
  calendarId: string;
  googleEventId: string;
  classification: GoogleEventClassification | null;
  ownerMemberId: string | null;
  purpose: string | null;
  notes: string | null;
  output: string | null;
  outputAt: string | null;
  companyIds: readonly string[];
  contactIds: readonly string[];
  participantMemberIds: readonly string[];
  taskIds: readonly string[];
}>;

export type GoogleEventArtifactValues = {
  classification?: string | null;
  notes?: string | null;
  output?: string | null;
  companyIds?: readonly string[];
  participantMemberIds?: readonly string[];
  taskIds?: readonly string[];
};

export class GoogleEventArtifactValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleEventArtifactValidationError";
  }
}

export function validateGoogleEventArtifact(
  identity: Pick<GoogleEventArtifact, "memberId" | "calendarId" | "googleEventId">,
  values: GoogleEventArtifactValues,
  now: string,
  current?: GoogleEventArtifact | null,
): GoogleEventArtifact {
  const classification = optionalClassification(values.classification);
  const output = optionalText(values.output, "O output", 4000);
  if (output && classification !== "meeting") {
    throw new GoogleEventArtifactValidationError(
      "Só um evento classificado como Meeting pode ter output.",
    );
  }
  const participantMemberIds = uniqueIds(values.participantMemberIds);
  if (classification === "meeting" && participantMemberIds.length === 0) {
    throw new GoogleEventArtifactValidationError(
      "Seleciona pelo menos um participante para a Meeting.",
    );
  }
  return {
    memberId: requiredText(identity.memberId, "O Member", 100),
    calendarId: requiredText(identity.calendarId, "O Calendar Google", 1024),
    googleEventId: requiredText(identity.googleEventId, "O evento Google", 1024),
    classification,
    ownerMemberId: null,
    purpose: null,
    notes: optionalText(values.notes, "As notas", 12000),
    output,
    outputAt:
      output && current?.output === output
        ? (current.outputAt ?? new Date(now).toISOString())
        : output
          ? new Date(now).toISOString()
          : null,
    companyIds: uniqueIds(values.companyIds),
    contactIds: [],
    participantMemberIds,
    taskIds: uniqueIds(values.taskIds),
  };
}

function optionalClassification(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";
  if (!normalized) return null;
  if (GOOGLE_EVENT_CLASSIFICATIONS.includes(normalized as GoogleEventClassification)) {
    return normalized as GoogleEventClassification;
  }
  throw new GoogleEventArtifactValidationError("A classificação do evento Google não é válida.");
}

function requiredText(value: string, label: string, maximum: number) {
  const normalized = value.trim();
  if (!normalized) throw new GoogleEventArtifactValidationError(`${label} é obrigatório.`);
  if (normalized.length > maximum) {
    throw new GoogleEventArtifactValidationError(
      `${label} não pode exceder ${maximum} caracteres.`,
    );
  }
  return normalized;
}

function optionalText(value: string | null | undefined, label: string, maximum: number) {
  const normalized = value?.trim() ?? "";
  if (!normalized) return null;
  if (normalized.length > maximum) {
    throw new GoogleEventArtifactValidationError(
      `${label} não pode exceder ${maximum} caracteres.`,
    );
  }
  return normalized;
}

function uniqueIds(values: readonly string[] | undefined) {
  return [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))];
}
