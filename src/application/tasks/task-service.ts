import type { MemberDirectory } from "@/application/members/contracts";
import {
  blockTask,
  cancelTask,
  completeTask,
  startTask,
  TaskTransitionError,
  type TaskValues,
  TaskValidationError,
  unblockTask,
  validateTaskValues,
} from "@/domain/tasks/task";
import type { TaskContextDirectory, TaskFormOptions, TaskRepository } from "./contracts";
export class TaskNotFoundError extends Error {
  constructor() {
    super("A Task não existe.");
    this.name = "TaskNotFoundError";
  }
}
export class TaskReferenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TaskReferenceError";
  }
}
export class TaskService {
  constructor(
    private readonly tasks: TaskRepository,
    private readonly members: MemberDirectory,
    private readonly contexts: TaskContextDirectory,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}
  async getFormOptions(
    googleEvents: TaskFormOptions["googleEvents"] = [],
  ): Promise<TaskFormOptions> {
    const [members, companies, meetings] = await Promise.all([
      this.members.listActive(),
      this.contexts.listCompanies(),
      this.contexts.listMeetings(),
    ]);
    return { members, companies, meetings, googleEvents };
  }
  async getTask(id: string) {
    const task = await this.tasks.findById(id);
    if (!task) throw new TaskNotFoundError();
    return task;
  }
  async createTask(values: TaskValues) {
    const valid = validateTaskValues(values);
    await this.assertReferences(valid);
    return this.tasks.create(valid);
  }
  async updateTask(id: string, values: TaskValues) {
    const task = await this.getTask(id);
    if (task.status === "completed" || task.status === "cancelled")
      throw new TaskTransitionError("Uma Task concluída ou cancelada não pode ser editada.");
    const valid = validateTaskValues(values);
    if (JSON.stringify(valid.origin) !== JSON.stringify(task.origin))
      throw new TaskTransitionError("A origem da Task não pode ser alterada.");
    await this.assertReferences(valid);
    return this.tasks.update(task, valid);
  }
  async startTask(id: string) {
    return this.tasks.saveState(startTask(await this.getTask(id)));
  }
  async blockTask(id: string, reason: string, nextMove: string) {
    return this.tasks.saveState(blockTask(await this.getTask(id), reason, nextMove));
  }
  async unblockTask(id: string) {
    return this.tasks.saveState(unblockTask(await this.getTask(id)));
  }
  async completeTask(id: string, note?: string | null) {
    return this.tasks.saveState(completeTask(await this.getTask(id), this.now(), note));
  }
  async cancelTask(id: string) {
    return this.tasks.saveState(cancelTask(await this.getTask(id)));
  }
  async deleteTask(id: string) {
    await this.getTask(id);
    await this.tasks.delete(id);
  }
  private async assertReferences(values: ReturnType<typeof validateTaskValues>) {
    if (!(await this.members.isActive(values.ownerMemberId)))
      throw new TaskReferenceError("Seleciona um owner ativo.");
    if (!(await this.contexts.companiesExist(values.companyIds)))
      throw new TaskReferenceError("Uma das Organisations selecionadas já não existe.");
    if (!(await this.contexts.meetingsExist(values.meetingIds)))
      throw new TaskReferenceError("Uma das Meetings selecionadas já não existe.");
    if (
      values.origin.type === "decision" &&
      !(await this.contexts.decisionsExist([values.origin.decisionId]))
    )
      throw new TaskReferenceError("A Decision de origem já não existe.");
  }
}
export function getTaskApplicationErrorMessage(error: unknown) {
  if (
    error instanceof TaskValidationError ||
    error instanceof TaskTransitionError ||
    error instanceof TaskNotFoundError ||
    error instanceof TaskReferenceError ||
    (error instanceof Error && error.name === "TaskPersistenceError")
  )
    return error.message;
  return "Não foi possível guardar a Task. Tenta novamente.";
}
