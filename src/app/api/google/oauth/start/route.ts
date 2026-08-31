import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/application/auth/current-user";
import {
  createGoogleConnectionReadModel,
  createGoogleIntegrationModule,
} from "@/foundation/composition/google";
import { GoogleConfigurationError } from "@/foundation/config/google-env";
import {
  createGoogleOAuthState,
  GOOGLE_OAUTH_STATE_COOKIE,
  GOOGLE_OAUTH_STATE_TTL_SECONDS,
} from "@/foundation/security/google-oauth-state";
import { FEEDBACK_QUERY_KEY } from "@/foundation/ui/feedback";
import { canManageGoogle } from "@/foundation/security/google-access";

export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));
  if (!canManageGoogle(user.role)) {
    return redirectToSettings(request, "A ligação Google é gerida por Admin.");
  }

  try {
    await (await createGoogleConnectionReadModel()).findActiveByMemberId(user.id);
  } catch {
    return redirectToSettings(
      request,
      "A estrutura Google ainda não está disponível na base de dados.",
    );
  }

  try {
    const { env, service } = await createGoogleIntegrationModule();
    const state = await createGoogleOAuthState(user.id, env.tokenEncryptionKey);
    const response = NextResponse.redirect(service.createAuthorizationUrl(state, user.email));
    response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      maxAge: GOOGLE_OAUTH_STATE_TTL_SECONDS,
      path: "/api/google/oauth/callback",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    return response;
  } catch (error) {
    const message =
      error instanceof GoogleConfigurationError
        ? "A integração Google ainda não está configurada no servidor."
        : "Não foi possível iniciar a ligação ao Google.";
    return redirectToSettings(request, message);
  }
}

function redirectToSettings(request: Request, message: string) {
  const url = new URL("/settings", request.url);
  url.searchParams.set(FEEDBACK_QUERY_KEY, message);
  url.hash = "google";
  return NextResponse.redirect(url);
}
