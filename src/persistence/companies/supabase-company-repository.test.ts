import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { SupabaseCompanyRepository } from "./supabase-company-repository";

function repositoryWithRpcError(error: { code: string; message: string } | null) {
  const rpc = vi.fn().mockResolvedValue({ error });
  const repository = new SupabaseCompanyRepository({
    rpc,
  } as unknown as SupabaseClient);
  return { repository, rpc };
}

describe("SupabaseCompanyRepository delete", () => {
  it("trata qualquer foreign key protegida como contexto operacional", async () => {
    const { repository } = repositoryWithRpcError({
      code: "23503",
      message: "projects_client_company_id_fkey",
    });

    await expect(repository.deleteIfUnreferenced("company-1")).resolves.toBe("protected");
  });

  it("preserva os resultados explícitos do RPC", async () => {
    const profiles = repositoryWithRpcError({
      code: "23503",
      message: "Remove or reassign the Organisation profiles first",
    }).repository;
    const missing = repositoryWithRpcError({
      code: "P0002",
      message: "Organisation not found",
    }).repository;
    const deleted = repositoryWithRpcError(null).repository;

    await expect(profiles.deleteIfUnreferenced("company-1")).resolves.toBe("profiles");
    await expect(missing.deleteIfUnreferenced("company-1")).resolves.toBe("not_found");
    await expect(deleted.deleteIfUnreferenced("company-1")).resolves.toBe("deleted");
  });
});
