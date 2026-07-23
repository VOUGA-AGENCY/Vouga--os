import { describe, expect, it } from "vitest";

import type { MemberDirectory } from "@/application/members/contracts";
import type { Decision } from "@/domain/decisions/decision";

import type { DecisionContextDirectory, DecisionRepository } from "./contracts";
import { DecisionReferenceError, DecisionService } from "./decision-service";

const direct = {
  title: "Manter o acesso fechado",
  choice: "Provisionar utilizadores manualmente.",
  reason: "A V1 ainda não precisa de signup público.",
  impact: "O acesso continua reservado à equipa fundadora.",
  authorityMemberId: "member-1",
  decidedOn: "2026-07-16",
  companyIds: ["company-1"],
};

function setup({
  active = true,
  companies = true,
  meetings = true,
  tasks = true,
  ids = ["decision-1", "decision-2"],
}: {
  active?: boolean;
  companies?: boolean;
  meetings?: boolean;
  tasks?: boolean;
  ids?: string[];
} = {}) {
  const saved = new Map<string, Decision>();
  const repository: DecisionRepository = {
    findById: async (id) => saved.get(id) ?? null,
    create: async (id, values, revision) => {
      if (revision) {
        const previous = saved.get(revision.previousDecisionId)!;
        saved.set(previous.id, {
          ...previous,
          status:
            revision.effect === "supersedes"
              ? "superseded"
              : revision.effect === "revokes"
                ? "revoked"
                : "current",
        });
      }
      const decision: Decision = {
        id,
        ...values,
        status: "current",
        revision,
        createdAt: "2026-07-16T00:00:00Z",
        updatedAt: "2026-07-16T00:00:00Z",
      };
      saved.set(id, decision);
      return decision;
    },
  };
  const members: MemberDirectory = {
    listActive: async () => [],
    isActive: async () => active,
  };
  const contexts: DecisionContextDirectory = {
    listCompanies: async () => [],
    listMeetings: async () => [],
    listTasks: async () => [],
    companiesExist: async () => companies,
    meetingsExist: async () => meetings,
    tasksExist: async () => tasks,
  };
  let index = 0;
  return {
    service: new DecisionService(repository, members, contexts, () => ids[index++] ?? "same"),
    saved,
  };
}

describe("DecisionService", () => {
  it("cria Decisions dentro e fora de Meeting com relações explícitas", async () => {
    const app = setup();
    const created = await app.service.createDecision({
      ...direct,
      originMeetingId: "meeting-1",
      taskIds: ["task-1"],
    });
    expect(created.originMeetingId).toBe("meeting-1");
    expect(created.meetingIds).toContain("meeting-1");
    expect(created.taskIds).toEqual(["task-1"]);
  });

  it("substitui, limita e revoga preservando a Decision anterior", async () => {
    const superseded = setup();
    const first = await superseded.service.createDecision(direct);
    const replacement = await superseded.service.reviewDecision(first.id, "supersedes", {
      ...direct,
      choice: "Abrir signup apenas por convite.",
    });
    expect(superseded.saved.get(first.id)?.status).toBe("superseded");
    expect(replacement.revision).toEqual({
      previousDecisionId: first.id,
      effect: "supersedes",
    });

    const limited = setup();
    const limitedFirst = await limited.service.createDecision(direct);
    await limited.service.reviewDecision(limitedFirst.id, "limits", {
      ...direct,
      choice: "Manter acesso fechado apenas até ao piloto.",
    });
    expect(limited.saved.get(limitedFirst.id)?.status).toBe("current");

    const revoked = setup();
    const revokedFirst = await revoked.service.createDecision(direct);
    await revoked.service.reviewDecision(revokedFirst.id, "revokes", {
      ...direct,
      choice: "Deixar de aplicar a regra de acesso fechado.",
    });
    expect(revoked.saved.get(revokedFirst.id)?.status).toBe("revoked");
  });

  it("rejeita revisão de Decision terminal e autorreferência", async () => {
    const terminal = setup({ ids: ["decision-1", "decision-2", "decision-3"] });
    const first = await terminal.service.createDecision(direct);
    await terminal.service.reviewDecision(first.id, "revokes", {
      ...direct,
      choice: "Revogar a escolha.",
    });
    await expect(
      terminal.service.reviewDecision(first.id, "limits", {
        ...direct,
        choice: "Limitar a escolha revogada.",
      }),
    ).rejects.toThrow("vigente");

    const self = setup({ ids: ["same", "same"] });
    const same = await self.service.createDecision(direct);
    await expect(
      self.service.reviewDecision(same.id, "limits", {
        ...direct,
        choice: "Limitar.",
      }),
    ).rejects.toThrow("si própria");
  });

  it("rejeita autoridade inativa e referências inexistentes", async () => {
    await expect(setup({ active: false }).service.createDecision(direct)).rejects.toBeInstanceOf(
      DecisionReferenceError,
    );
    await expect(
      setup({ companies: false }).service.createDecision(direct),
    ).rejects.toBeInstanceOf(DecisionReferenceError);
    await expect(
      setup({ meetings: false }).service.createDecision({
        ...direct,
        originMeetingId: "missing",
      }),
    ).rejects.toBeInstanceOf(DecisionReferenceError);
    await expect(
      setup({ tasks: false }).service.createDecision({ ...direct, taskIds: ["missing"] }),
    ).rejects.toBeInstanceOf(DecisionReferenceError);
  });
});
