import { describe, expect, it } from "vitest";

import { SupabaseConfigurationError } from "@/foundation/config/supabase-env";

import { getAuthenticationErrorMessage } from "./messages";

describe("getAuthenticationErrorMessage", () => {
  it("traduz credenciais inválidas sem expor detalhes técnicos", () => {
    expect(getAuthenticationErrorMessage({ message: "Invalid login credentials" })).toBe(
      "Email ou palavra-passe incorretos."
    );
  });

  it("explica quando falta a configuração local", () => {
    expect(getAuthenticationErrorMessage(new SupabaseConfigurationError())).toBe(
      "A ligação ao Supabase ainda não está configurada."
    );
  });

  it("usa uma mensagem segura para erros desconhecidos", () => {
    expect(getAuthenticationErrorMessage(new Error("network detail"))).toBe(
      "Não foi possível iniciar sessão. Tenta novamente."
    );
  });
});
