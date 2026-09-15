import { describe, expect, it, vi } from "vitest";

import type { ContactRepository, RelationsDirectory } from "./contracts";
import { RelationsService } from "./relations-service";

function createService() {
  const recordContactInteraction = vi.fn().mockResolvedValue("interaction-1");
  const createInteraction = vi.fn().mockResolvedValue("interaction-2");
  const updateInteraction = vi.fn().mockResolvedValue(undefined);
  const repository = {
    recordContactInteraction,
    createInteraction,
    updateInteraction,
  } as unknown as ContactRepository;
  const directory = {} as RelationsDirectory;
  return {
    service: new RelationsService(repository, directory),
    recordContactInteraction,
    createInteraction,
    updateInteraction,
  };
}

describe("RelationsService interactions", () => {
  it("mantém a Organisation obrigatória e normaliza o Perfil opcional", async () => {
    const { service, recordContactInteraction } = createService();

    await service.recordContactInteraction({
      companyId: "  company-1  ",
      contactId: "  ",
      channel: "linkedin",
      body: "  Primeiro contacto  ",
      stage: "contacted",
    });

    expect(recordContactInteraction).toHaveBeenCalledWith({
      companyId: "company-1",
      contactId: null,
      channel: "linkedin",
      body: "Primeiro contacto",
      sourceTemplateId: null,
      stage: "contacted",
    });
  });

  it("rejeita uma Interaction sem Organisation", async () => {
    const { service, recordContactInteraction } = createService();

    await expect(
      service.recordContactInteraction({
        companyId: " ",
        contactId: null,
        channel: "email",
        body: "Mensagem",
        stage: "contacted",
      }),
    ).rejects.toThrow("Seleciona uma Organisation.");
    expect(recordContactInteraction).not.toHaveBeenCalled();
  });

  it("propaga Company e Profile opcional no caminho append-only genérico", async () => {
    const { service, createInteraction } = createService();

    await service.createInteraction({
      companyId: " company-2 ",
      contactId: null,
      direction: "inbound",
      channel: "call",
      body: "  Chamada recebida ",
      occurredAt: "2026-08-29T10:00:00.000Z",
      memberId: "member-1",
    });

    expect(createInteraction).toHaveBeenCalledWith({
      companyId: "company-2",
      contactId: null,
      direction: "inbound",
      channel: "call",
      body: "Chamada recebida",
      occurredAt: "2026-08-29T10:00:00.000Z",
      memberId: "member-1",
      recordedByMemberId: "member-1",
      replyToInteractionId: null,
      sourceTemplateId: null,
    });
  });

  it("atualiza a mensagem e o canal da Interaction e valida os campos", async () => {
    const { service, updateInteraction } = createService();

    await service.updateInteraction(" int-1 ", "  Nova mensagem atualizada  ", "linkedin");

    expect(updateInteraction).toHaveBeenCalledWith("int-1", "Nova mensagem atualizada", "linkedin");

    await expect(service.updateInteraction("int-1", "   ")).rejects.toThrow(
      "A mensagem do log não pode estar vazia.",
    );
    await expect(service.updateInteraction("  ", "Texto")).rejects.toThrow(
      "Identificador de interação inválido.",
    );
    await expect(
      service.updateInteraction("int-1", "Texto", "sms" as unknown as "email"),
    ).rejects.toThrow("O tipo de interação não é válido.");
  });
});
