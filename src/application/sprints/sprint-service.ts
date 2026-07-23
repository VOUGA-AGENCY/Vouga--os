import type { MemberDirectory } from "@/application/members/contracts";
import { assertCanActivateSprint, assertCanCancelSprint, assertCanChangeCommitment, SprintTransitionError, SprintValidationError, type SprintClosureValues, type SprintValues, validateSprintClosure, validateSprintValues } from "@/domain/sprints/sprint";
import type { SprintFormOptions, SprintRepository, SprintTaskDirectory } from "./contracts";

export class SprintNotFoundError extends Error { constructor() { super("A Sprint não existe."); this.name = "SprintNotFoundError"; } }
export class SprintReferenceError extends Error { constructor(message: string) { super(message); this.name = "SprintReferenceError"; } }

export class SprintService {
  constructor(private readonly sprints: SprintRepository, private readonly members: MemberDirectory, private readonly tasks: SprintTaskDirectory) {}
  async getFormOptions(): Promise<SprintFormOptions> { const [members, tasks] = await Promise.all([this.members.listActive(), this.tasks.listTasks()]); return { members, tasks }; }
  async getSprint(id: string) { const sprint = await this.sprints.findById(id); if (!sprint) throw new SprintNotFoundError(); return sprint; }
  async createSprint(values: SprintValues) { const valid = validateSprintValues(values); await this.assertReferences(valid.ownerMemberId, valid.taskIds); return this.sprints.create(valid); }
  async activateSprint(id: string) { const sprint = await this.getSprint(id); assertCanActivateSprint(sprint); return this.sprints.activate(sprint); }
  async cancelSprint(id: string) { const sprint = await this.getSprint(id); assertCanCancelSprint(sprint); return this.sprints.cancel(sprint); }
  async addTasks(id: string, taskIds: readonly string[]) { const sprint = await this.getSprint(id); assertCanChangeCommitment(sprint); const unique = [...new Set(taskIds.filter(Boolean))]; if (!unique.length) throw new SprintValidationError("Seleciona pelo menos uma Task."); await this.assertTasks(unique); return this.sprints.addTasks(sprint, unique); }
  async removeTask(id: string, taskId: string) { const sprint = await this.getSprint(id); assertCanChangeCommitment(sprint, true); return this.sprints.removeTask(sprint, taskId); }
  async closeSprint(id: string, values: SprintClosureValues) { const sprint = await this.getSprint(id); const closure = validateSprintClosure(sprint, values); return this.sprints.close(sprint, closure.actualResult, closure.learning, closure.dispositions); }
  private async assertReferences(ownerId: string, taskIds: readonly string[]) { if (!(await this.members.isActive(ownerId))) throw new SprintReferenceError("Seleciona um owner ativo."); await this.assertTasks(taskIds); }
  private async assertTasks(ids: readonly string[]) { if (!(await this.tasks.tasksExist(ids))) throw new SprintReferenceError("Uma das Tasks selecionadas já não existe."); }
}
export function getSprintApplicationErrorMessage(error: unknown) { if (error instanceof SprintValidationError || error instanceof SprintTransitionError || error instanceof SprintNotFoundError || error instanceof SprintReferenceError) return error.message; return "Não foi possível guardar a Sprint. Tenta novamente."; }
