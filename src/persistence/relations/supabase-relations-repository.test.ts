import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { SupabaseContactRepository } from "./supabase-relations";

describe("SupabaseContactRepository interactions", () => {
  it("envia Profile nulo ao RPC sem perder a Organisation", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: "interaction-1", error: null });
    const repository = new SupabaseContactRepository({ rpc } as unknown as SupabaseClient);

    await repository.recordContactInteraction({
      companyId: "company-1",
      contactId: null,
      channel: "linkedin",
      body: "Primeiro contacto",
      sourceTemplateId: null,
      stage: "contacted",
    });

    expect(rpc).toHaveBeenCalledWith("record_contact_interaction", {
      p_company_id: "company-1",
      p_contact_id: null,
      p_channel: "linkedin",
      p_body: "Primeiro contacto",
      p_source_template_id: null,
      p_stage: "contacted",
    });
  });

  it("persiste Company obrigatória no caminho append-only genérico", async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: "interaction-2" }, error: null });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    const from = vi.fn(() => ({ insert }));
    const repository = new SupabaseContactRepository({ from } as unknown as SupabaseClient);

    await repository.createInteraction({
      companyId: "company-2",
      contactId: null,
      direction: "inbound",
      channel: "call",
      body: "Chamada recebida",
      occurredAt: "2026-08-29T10:00:00.000Z",
      replyToInteractionId: null,
      sourceTemplateId: null,
      recordedByMemberId: "member-1",
    });

    expect(from).toHaveBeenCalledWith("contact_interactions");
    expect(insert).toHaveBeenCalledWith({
      company_id: "company-2",
      contact_id: null,
      direction: "inbound",
      channel: "call",
      body: "Chamada recebida",
      occurred_at: "2026-08-29T10:00:00.000Z",
      reply_to_interaction_id: null,
      source_template_id: null,
      recorded_by_member_id: "member-1",
    });
  });
});
