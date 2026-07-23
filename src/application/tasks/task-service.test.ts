import { describe, expect, it } from "vitest";
import type { MemberDirectory } from "@/application/members/contracts";
import type { Task } from "@/domain/tasks/task";
import type { TaskContextDirectory, TaskRepository } from "./contracts";
import { TaskService } from "./task-service";
function setup() {
  let saved: Task | null = null;
  const repository: TaskRepository = {
    findById: async () => saved,
    create: async (values) =>
      (saved = {
        id: "task-1",
        ...values,
        status: "todo",
        blockedReason: null,
        blockedNextMove: null,
        completionNote: null,
        completedAt: null,
        createdAt: "2026-07-16T00:00:00Z",
        updatedAt: "2026-07-16T00:00:00Z",
      }),
    update: async (_, values) => (saved = { ...saved!, ...values }),
    saveState: async (task) => (saved = task),
    delete: async () => {
      saved = null;
    },
  };
  const members: MemberDirectory = { listActive: async () => [], isActive: async () => true };
  const contexts: TaskContextDirectory = {
    listCompanies: async () => [],
    listMeetings: async () => [],
    companiesExist: async () => true,
    meetingsExist: async () => true,
    decisionsExist: async () => true,
  };
  return { service: new TaskService(repository, members, contexts), get: () => saved };
}
const values = {
  title: "Preparar entrega",
  ownerMemberId: "member-1",
  origin: { type: "planning" as const },
};
describe("TaskService", () => {
  it("cria e preserva origem imutável", async () => {
    const x = setup();
    const task = await x.service.createTask(values);
    await expect(
      x.service.updateTask(task.id, {
        ...values,
        origin: { type: "meeting", meetingId: "meeting-1" },
      }),
    ).rejects.toThrow("origem");
  });
  it("elimina pelo caso de uso explícito", async () => {
    const x = setup();
    const task = await x.service.createTask(values);
    await x.service.deleteTask(task.id);
    expect(x.get()).toBeNull();
  });
});
