import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { SupabaseRelationsReadModel } from "./supabase-relations";

function queryResult(data: unknown[]) {
  const result = Promise.resolve({ data, error: null });
  const builder: Record<string, unknown> = {
    then: result.then.bind(result),
  };

  for (const method of ["select", "not", "neq", "order", "eq"]) {
    builder[method] = vi.fn(() => builder);
  }

  return builder;
}

describe("SupabaseRelationsReadModel contact pipeline", () => {
  it("trata toda Organisation com estado de prospeção como Prospeção", async () => {
    const rows: Record<string, unknown[]> = {
      companies: [
        {
          id: "company-without-profile",
          name: "Sem perfil",
          prospecting_stage: "to_contact",
          primary_contact_id: null,
          updated_at: "2026-08-29T10:00:00.000Z",
        },
        {
          id: "company-with-partner",
          name: "Com parceiro",
          prospecting_stage: "contacted",
          primary_contact_id: "contact-partner",
          updated_at: "2026-08-29T09:00:00.000Z",
        },
      ],
      contacts: [
        {
          id: "contact-partner",
          display_name: "Perfil parceiro",
          job_title: null,
          company_id: "company-with-partner",
          avatar_url: null,
          relationship_role: "partner",
        },
      ],
      contact_interactions: [
        {
          id: "interaction-company-only",
          company_id: "company-without-profile",
          contact_id: null,
          channel: "email",
          body: "Contacto sem perfil reconhecido",
          occurred_at: "2026-08-29T11:00:00.000Z",
          contact: null,
        },
      ],
      task_companies: [],
    };
    const supabase = {
      from: vi.fn((table: string) => queryResult(rows[table] ?? [])),
    } as unknown as SupabaseClient;

    const pipeline = await new SupabaseRelationsReadModel(supabase).listContactPipeline();

    expect(pipeline).toHaveLength(2);
    expect(pipeline.map((row) => row.companyId)).toEqual([
      "company-without-profile",
      "company-with-partner",
    ]);
    expect(pipeline[0]?.primaryContactId).toBeNull();
    expect(pipeline[0]?.lastContact).toEqual({
      channel: "email",
      body: "Contacto sem perfil reconhecido",
      occurredAt: "2026-08-29T11:00:00.000Z",
    });
  });

  it("lê o histórico oficial da Organisation com Profile opcional", async () => {
    const rows: Record<string, unknown[]> = {
      contact_interactions: [
        {
          id: "interaction-with-profile",
          company_id: "company-1",
          contact_id: "contact-1",
          channel: "linkedin",
          body: "Mensagem com perfil",
          occurred_at: "2026-08-29T12:00:00.000Z",
          contact: { display_name: "Ana" },
        },
        {
          id: "interaction-without-profile",
          company_id: "company-1",
          contact_id: null,
          channel: "call",
          body: "Chamada geral",
          occurred_at: "2026-08-29T11:00:00.000Z",
          contact: null,
        },
      ],
    };
    const supabase = {
      from: vi.fn((table: string) => queryResult(rows[table] ?? [])),
    } as unknown as SupabaseClient;

    await expect(
      new SupabaseRelationsReadModel(supabase).listInteractionsByCompany("company-1"),
    ).resolves.toEqual([
      {
        id: "interaction-with-profile",
        contactId: "contact-1",
        contactName: "Ana",
        channel: "linkedin",
        body: "Mensagem com perfil",
        occurredAt: "2026-08-29T12:00:00.000Z",
      },
      {
        id: "interaction-without-profile",
        contactId: null,
        contactName: null,
        channel: "call",
        body: "Chamada geral",
        occurredAt: "2026-08-29T11:00:00.000Z",
      },
    ]);
  });
});
