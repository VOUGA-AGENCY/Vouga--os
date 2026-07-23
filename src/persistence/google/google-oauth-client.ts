import "server-only";

import type {
  GoogleAuthorizationTokens,
  GoogleIdentity,
  GoogleOAuthGateway,
} from "@/application/google/contracts";
import { GOOGLE_OAUTH_SCOPES } from "@/application/google/google-scopes";
import type { GoogleOAuthEnv } from "@/foundation/config/google-env";

type Fetcher = typeof fetch;

export class GoogleOAuthRequestError extends Error {
  constructor() {
    super("O Google não conseguiu concluir a autorização.");
    this.name = "GoogleOAuthRequestError";
  }
}

export class GoogleOAuthClient implements GoogleOAuthGateway {
  constructor(
    private readonly env: GoogleOAuthEnv,
    private readonly fetcher: Fetcher = fetch,
  ) {}

  createAuthorizationUrl(values: { state: string; loginHint?: string | null }): string {
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("client_id", this.env.clientId);
    url.searchParams.set("include_granted_scopes", "true");
    url.searchParams.set("prompt", "consent select_account");
    url.searchParams.set("redirect_uri", this.env.redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", GOOGLE_OAUTH_SCOPES.join(" "));
    url.searchParams.set("state", values.state);
    if (values.loginHint) url.searchParams.set("login_hint", values.loginHint);
    return url.toString();
  }

  async exchangeAuthorizationCode(code: string): Promise<GoogleAuthorizationTokens> {
    const response = await this.fetcher("https://oauth2.googleapis.com/token", {
      body: new URLSearchParams({
        client_id: this.env.clientId,
        client_secret: this.env.clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: this.env.redirectUri,
      }),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      method: "POST",
      signal: AbortSignal.timeout(15_000),
    });
    const body = (await response.json().catch(() => null)) as {
      access_token?: unknown;
      refresh_token?: unknown;
      scope?: unknown;
    } | null;
    if (!response.ok || typeof body?.access_token !== "string") {
      throw new GoogleOAuthRequestError();
    }

    return {
      accessToken: body.access_token,
      refreshToken: typeof body.refresh_token === "string" ? body.refresh_token : null,
      scopes: typeof body.scope === "string" ? body.scope.split(" ").filter(Boolean) : [],
    };
  }

  async getIdentity(accessToken: string): Promise<GoogleIdentity> {
    const response = await this.fetcher("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(15_000),
    });
    const body = (await response.json().catch(() => null)) as {
      email?: unknown;
      email_verified?: unknown;
      sub?: unknown;
    } | null;
    if (
      !response.ok ||
      typeof body?.sub !== "string" ||
      typeof body.email !== "string" ||
      typeof body.email_verified !== "boolean"
    ) {
      throw new GoogleOAuthRequestError();
    }

    return {
      email: body.email,
      emailVerified: body.email_verified,
      subject: body.sub,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<string> {
    const response = await this.fetcher("https://oauth2.googleapis.com/token", {
      body: new URLSearchParams({
        client_id: this.env.clientId,
        client_secret: this.env.clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      method: "POST",
      signal: AbortSignal.timeout(15_000),
    });
    const body = (await response.json().catch(() => null)) as { access_token?: unknown } | null;
    if (!response.ok || typeof body?.access_token !== "string") {
      throw new GoogleOAuthRequestError();
    }
    return body.access_token;
  }

  async revokeToken(refreshToken: string): Promise<void> {
    const response = await this.fetcher("https://oauth2.googleapis.com/revoke", {
      body: new URLSearchParams({ token: refreshToken }),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      method: "POST",
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new GoogleOAuthRequestError();
  }
}
