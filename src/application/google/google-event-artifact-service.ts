import type { MemberDirectory } from "@/application/members/contracts";
import type { MeetingContextDirectory } from "@/application/meetings/contracts";
import {
  type GoogleEventArtifactValues,
  GoogleEventArtifactValidationError,
  validateGoogleEventArtifact,
} from "@/domain/google/google-event-artifact";

import type { GoogleEventArtifactRepository } from "./contracts";
import { GoogleCalendarEventService } from "./google-calendar-event-service";

export class GoogleEventArtifactNotFoundError extends Error {
  constructor() {
    super("O evento Google já não está disponível.");
    this.name = "GoogleEventArtifactNotFoundError";
  }
}

export class GoogleEventArtifactService {
  constructor(
    private readonly events: GoogleCalendarEventService,
    private readonly artifacts: GoogleEventArtifactRepository,
    private readonly members: MemberDirectory,
    private readonly contexts: MeetingContextDirectory,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async getDetail(memberId: string, calendarId: string, eventId: string) {
    const [event, artifact, members, companies, tasks] = await Promise.all([
      this.events.getVisibleEvent(memberId, calendarId, eventId),
      this.artifacts.find(memberId, calendarId, eventId),
      this.members.listActive(),
      this.contexts.listCompanies(),
      this.contexts.listTasks(),
    ]);
    if (!event) throw new GoogleEventArtifactNotFoundError();
    return { artifact, companies, event, members, tasks };
  }

  async save(
    memberId: string,
    calendarId: string,
    eventId: string,
    values: GoogleEventArtifactValues,
  ) {
    const [event, current] = await Promise.all([
      this.events.getVisibleEvent(memberId, calendarId, eventId),
      this.artifacts.find(memberId, calendarId, eventId),
    ]);
    if (!event) {
      throw new GoogleEventArtifactNotFoundError();
    }
    const artifact = validateGoogleEventArtifact(
      { calendarId, googleEventId: eventId, memberId },
      values,
      this.now(),
      current,
    );
    const active = await Promise.all(
      artifact.participantMemberIds.map((id) => this.members.isActive(id)),
    );
    if (active.some((value) => !value))
      throw new GoogleEventArtifactValidationError("Seleciona apenas participantes ativos.");
    if (!(await this.contexts.companiesExist(artifact.companyIds))) {
      throw new GoogleEventArtifactValidationError("Uma das Organisations já não existe.");
    }
    if (!(await this.contexts.tasksExist(artifact.taskIds)))
      throw new GoogleEventArtifactValidationError("Uma das Tasks já não existe.");
    await this.artifacts.save(artifact);
    return artifact;
  }

  async delete(memberId: string, calendarId: string, eventId: string) {
    const event = await this.events.getVisibleEvent(memberId, calendarId, eventId);
    if (!event) throw new GoogleEventArtifactNotFoundError();
    if (await this.artifacts.hasTaskOrigins(memberId, calendarId, eventId))
      throw new GoogleEventArtifactValidationError(
        "Este evento é origem de uma Task e não pode ser eliminado.",
      );
    await this.events.deleteVisibleEvent(memberId, calendarId, eventId);
    await this.artifacts.delete(memberId, calendarId, eventId);
  }
}

export function getGoogleEventArtifactErrorMessage(error: unknown) {
  if (
    error instanceof GoogleEventArtifactValidationError ||
    error instanceof GoogleEventArtifactNotFoundError
  ) {
    return error.message;
  }
  return "Não foi possível guardar o contexto deste evento.";
}
