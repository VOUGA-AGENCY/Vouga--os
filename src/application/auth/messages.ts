import { SupabaseConfigurationError } from "@/foundation/config/supabase-env";

export function getAuthenticationErrorMessage(error: unknown): string {
  if (error instanceof SupabaseConfigurationError) return error.message;

  if (typeof error === "object" && error && "message" in error) {
    const message = String(error.message).toLowerCase();
    if (message.includes("invalid login credentials")) {
      return "Email ou palavra-passe incorretos.";
    }
    if (message.includes("email not confirmed")) {
      return "O email ainda não foi confirmado.";
    }
  }

  return "Não foi possível iniciar sessão. Tenta novamente.";
}
