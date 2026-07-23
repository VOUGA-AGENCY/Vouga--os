import type { MemberDirectory } from "@/application/members/contracts";
import {
  cancelMeeting,
  closeMeeting,
  effectiveMeetingStatus,
  MeetingTransitionError,
  type MeetingValues,
  MeetingValidationError,
  validateMeetingValues,
} from "@/domain/meetings/meeting";
import type { MeetingContextDirectory, MeetingFormOptions, MeetingRepository } from "./contracts";

export class MeetingNotFoundError extends Error {
  constructor() {
    super("A Meeting ou Event não existe.");
    this.name = "MeetingNotFoundError";
  }
}
export class MeetingMemberError extends Error {
  constructor() {
    super("Seleciona apenas participantes internos ativos.");
    this.name = "MeetingMemberError";
  }
}
export class MeetingCompanyError extends Error {
  constructor() {
    super("Uma das Organisations selecionadas já não existe.");
    this.name = "MeetingCompanyError";
  }
}
export class MeetingTaskError extends Error {
  constructor() {
    super("Uma das Tasks selecionadas já não existe.");
    this.name = "MeetingTaskError";
  }
}

export class MeetingService {
  constructor(
    private readonly meetings: MeetingRepository,
    private readonly members: MemberDirectory,
    private readonly contexts: MeetingContextDirectory,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}
  async getFormOptions(): Promise<MeetingFormOptions> {
    const [members, companies, tasks] = await Promise.all([
      this.members.listActive(),
      this.contexts.listCompanies(),
      this.contexts.listTasks(),
    ]);
    return { members, companies, tasks };
  }
  async getMeeting(id: string) {
    const meeting = await this.meetings.findById(id);
    if (!meeting) throw new MeetingNotFoundError();
    return meeting;
  }
  async createMeeting(values: MeetingValues) {
    const valid = validateMeetingValues(await this.withVacationTitle(values));
    await this.assertReferences(valid);
    return this.meetings.create(valid);
  }
  async updateMeeting(id: string, values: MeetingValues) {
    const meeting = await this.getMeeting(id);
    const status = effectiveMeetingStatus(meeting, this.now());
    if (status === "closed" || status === "cancelled")
      throw new MeetingTransitionError("Uma Meeting fechada ou cancelada não pode ser editada.");
    const valid = validateMeetingValues(await this.withVacationTitle(values));
    await this.assertReferences(valid);
    return this.meetings.update(meeting, valid);
  }
  async cancelMeeting(id: string) {
    const meeting = await this.getMeeting(id);
    const status = effectiveMeetingStatus(meeting, this.now());
    if (status === "closed" || status === "cancelled")
      throw new MeetingTransitionError("Uma Meeting fechada ou cancelada não pode ser cancelada.");
    return this.meetings.saveState(cancelMeeting(meeting));
  }
  async closeMeeting(id: string, output: string) {
    const meeting = closeMeeting(await this.getMeeting(id), output, this.now());
    return this.meetings.close(meeting);
  }
  async deleteMeeting(id: string) {
    await this.getMeeting(id);
    await this.meetings.delete(id);
  }
  private async withVacationTitle(values: MeetingValues): Promise<MeetingValues> {
    if (values.kind !== "vacation") return values;
    const participantIds =
      values.participantMemberIds ??
      values.participants?.flatMap((participant) =>
        participant.memberId ? [participant.memberId] : [],
      ) ??
      [];
    const selectedId = [...new Set(participantIds.map((id) => id.trim()).filter(Boolean))][0];
    const member = (await this.members.listActive()).find((item) => item.id === selectedId);
    return { ...values, title: member ? `Vacation · ${member.displayName}` : "Vacation" };
  }
  private async assertReferences(values: ReturnType<typeof validateMeetingValues>) {
    const ids = values.participants.flatMap((participant) =>
      participant.memberId ? [participant.memberId] : [],
    );
    const active = await Promise.all(ids.map((id) => this.members.isActive(id)));
    if (active.some((value) => !value)) throw new MeetingMemberError();
    if (!(await this.contexts.companiesExist(values.companyIds))) throw new MeetingCompanyError();
    if (!(await this.contexts.tasksExist(values.taskIds))) throw new MeetingTaskError();
  }
}
export function getMeetingApplicationErrorMessage(error: unknown) {
  if (
    error instanceof MeetingValidationError ||
    error instanceof MeetingTransitionError ||
    error instanceof MeetingNotFoundError ||
    error instanceof MeetingMemberError ||
    error instanceof MeetingCompanyError ||
    error instanceof MeetingTaskError ||
    (error instanceof Error && error.name === "MeetingPersistenceError")
  )
    return error.message;
  return "Não foi possível guardar a Meeting ou Event. Tenta novamente.";
}
