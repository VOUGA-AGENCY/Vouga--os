import { type NextRequest, NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/application/auth/current-user";
import { getGoogleConnectionErrorMessage } from "@/application/google/google-connection-service";
import { createGoogleIntegrationModule } from "@/foundation/composition/google";
import { GoogleConfigurationError } from "@/foundation/config/google-env";
import {
  getGoogleOAuthStateFlow,
  GOOGLE_OAUTH_STATE_COOKIE,
  verifyGoogleOAuthState,
} from "@/foundation/security/google-oauth-state";
import { FEEDBACK_QUERY_KEY } from "@/foundation/ui/feedback";

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return clearState(NextResponse.redirect(new URL("/login", request.url)));

  let integration: Awaited<ReturnType<typeof createGoogleIntegrationModule>>;
  try {
    integration = await createGoogleIntegrationModule();
  } catch (error) {
    const message =
      error instanceof GoogleConfigurationError
        ? "A integração Google ainda não está configurada no servidor."
        : "Não foi possível concluir a ligação ao Google.";
    return clearState(redirectToSettings(request, message));
  }

  const state = request.nextUrl.searchParams.get("state") ?? undefined;
  const validState = await verifyGoogleOAuthState(
    state,
    request.cookies.get(GOOGLE_OAUTH_STATE_COOKIE)?.value,
    user.id,
    integration.env.tokenEncryptionKey,
  );
  if (!validState) {
    return clearState(
      redirectToSettings(request, "A autorização Google expirou. Tenta novamente."),
    );
  }

  if (request.nextUrl.searchParams.has("error")) {
    const flow = getGoogleOAuthStateFlow(state);
    return clearState(
      flow === "picker"
        ? redirectToNotes(request, "Seleção Google cancelada.")
        : redirectToSettings(request, "Ligação Google cancelada."),
    );
  }

  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return clearState(redirectToSettings(request, "O Google não devolveu uma autorização válida."));
  }

  try {
    const flow = getGoogleOAuthStateFlow(state);
    if (flow === "picker") {
      await integration.service.completePickerAuthorization(user.id, code);
      const pickedIds = parsePickedFileIds(request.nextUrl.searchParams.get("picked_file_ids"));
      return clearState(
        redirectToNotes(
          request,
          pickedIds.length === 1
            ? "Google Doc adicionado."
            : `${pickedIds.length} Google Docs adicionados.`,
        ),
      );
    }
    await integration.service.completeAuthorization(user.id, code);
    return clearState(redirectToSettings(request, "Conta Google ligada."));
  } catch (error) {
    const flow = getGoogleOAuthStateFlow(state);
    return clearState(
      flow === "picker"
        ? redirectToNotes(request, getGoogleConnectionErrorMessage(error))
        : redirectToSettings(request, getGoogleConnectionErrorMessage(error)),
    );
  }
}

function clearState(response: NextResponse) {
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/api/google/oauth/callback",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}

function redirectToSettings(request: Request, message: string) {
  const url = new URL("/settings", request.url);
  url.searchParams.set(FEEDBACK_QUERY_KEY, message);
  url.hash = "google";
  return NextResponse.redirect(url);
}

function redirectToNotes(request: Request, message: string) {
  const url = new URL("/notes", request.url);
  url.searchParams.set(FEEDBACK_QUERY_KEY, message);
  return NextResponse.redirect(url);
}

function parsePickedFileIds(value: string | null): string[] {
  return (value ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}
