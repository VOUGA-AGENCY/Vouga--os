import { describe, expect, it } from "vitest";
import {
  blockTask,
  cancelTask,
  completeTask,
  startTask,
  unblockTask,
  validateTaskValues,
  type Task,
} from "./task";
const values = {
  title: "Enviar proposta",
  ownerMemberId: "member-1",
  origin: { type: "planning" as const },
};
const task: Task = {
  id: "task-1",
  ...validateTaskValues(values),
  status: "todo",
  blockedReason: null,
  blockedNextMove: null,
  completionNote: null,
  completedAt: null,
  createdAt: "2026-07-16T00:00:00Z",
  updatedAt: "2026-07-16T00:00:00Z",
};
describe("Task", () => {
  it("cria compromisso mínimo com origem Planeamento", () => {
    expect(validateTaskValues(values)).toMatchObject({
      title: "Enviar proposta",
      expectedResult: null,
      purpose: "work",
      origin: { type: "planning" },
    });
  });
  it("distingue follow-up relacional sem criar outra entidade", () => {
    expect(validateTaskValues({ ...values, purpose: "relationship_follow_up" }).purpose).toBe(
      "relationship_follow_up",
    );
  });
  it("aceita origem local e Google concreta", () => {
    expect(
      validateTaskValues({ ...values, origin: { type: "meeting", meetingId: "meeting-1" } })
        .meetingIds,
    ).toContain("meeting-1");
    expect(
      validateTaskValues({
        ...values,
        origin: {
          type: "google_event",
          memberId: "member-1",
          calendarId: "primary",
          eventId: "event-1",
        },
      }).origin.type,
    ).toBe("google_event");
  });
  it("preserva transições existentes", () => {
    const blocked = blockTask(startTask(task), "Dependência", "Pedir resposta");
    expect(unblockTask(blocked).status).toBe("in_progress");
    expect(completeTask(task, "2026-07-16T01:00:00Z", "Proposta enviada.").status).toBe(
      "completed",
    );
    expect(cancelTask(task).status).toBe("cancelled");
  });
  it("exige evidência ao concluir", () => {
    expect(() => completeTask(task, "2026-07-16T01:00:00Z", "")).toThrow(
      "A evidência da conclusão é obrigatório.",
    );
  });
});
