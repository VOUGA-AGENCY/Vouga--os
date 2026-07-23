import { describe, expect, test, vi } from "vitest";

import { GOOGLE_DATA_SCOPES } from "@/application/google/google-scopes";

import { GoogleOAuthClient } from "./google-oauth-client";

const env = {
  clientId: "client-id",
  clientSecret: "client-secret",
  redirectUri: "http://localhost:3002/api/google/oauth/callback",
  tokenEncryptionKey: Buffer.alloc(32, 1).toString("base64"),
};

describe("GoogleOAuthClient", () => {
  test("cria authorization URL server-side com state e acesso offline", () => {
    const client = new GoogleOAuthClient(env);
    const url = new URL(
      client.createAuthorizationUrl({ loginHint: "hello@vouga.pt", state: "state" }),
    );

    expect(url.origin).toBe("https://accounts.google.com");
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("state")).toBe("state");
    expect(url.searchParams.get("redirect_uri")).toBe(env.redirectUri);
    expect(url.searchParams.get("scope")).toContain(GOOGLE_DATA_SCOPES[1]);
  });

  test("troca o code sem expor o client secret na URL", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: "access",
          refresh_token: "refresh",
          scope: GOOGLE_DATA_SCOPES.join(" "),
        }),
        { status: 200 },
      ),
    );
    const client = new GoogleOAuthClient(env, fetcher);

    await expect(client.exchangeAuthorizationCode("code")).resolves.toEqual({
      accessToken: "access",
      refreshToken: "refresh",
      scopes: GOOGLE_DATA_SCOPES,
    });
    expect(fetcher).toHaveBeenCalledWith(
      "https://oauth2.googleapis.com/token",
      expect.objectContaining({ method: "POST" }),
    );
    expect(String(fetcher.mock.calls[0]?.[0])).not.toContain("client-secret");
  });

  test("renova access tokens sem persistência adicional", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ access_token: "fresh-access" }), { status: 200 }),
      );
    const client = new GoogleOAuthClient(env, fetcher);

    await expect(client.refreshAccessToken("refresh-token")).resolves.toBe("fresh-access");
    const request = fetcher.mock.calls[0]?.[1] as RequestInit;
    expect(String(request.body)).toContain("grant_type=refresh_token");
  });
});
