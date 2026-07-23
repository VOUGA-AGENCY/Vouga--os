import { type NextRequest, NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/application/auth/current-user";
import { getGoogleConnectionErrorMessage } from "@/application/google/google-connection-service";
import { createGoogleIntegrationModule } from "@/foundation/composition/google";
import { GoogleConfigurationError } from "@/foundation/config/google-env";
import {
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
    return clearState(redirectToSettings(request, "Ligação Google cancelada."));
  }

  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return clearState(redirectToSettings(request, "O Google não devolveu uma autorização válida."));
  }

  try {
    await integration.service.completeAuthorization(user.id, code);
    return clearState(redirectToSettings(request, "Conta Google ligada."));
  } catch (error) {
    return clearState(redirectToSettings(request, getGoogleConnectionErrorMessage(error)));
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
