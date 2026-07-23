import { describe, expect, test, vi } from "vitest";

import type {
  GoogleConnectionRepository,
  GoogleOAuthGateway,
  GoogleTokenProtector,
  StoredGoogleConnection,
} from "./contracts";
import {
  GoogleConnectionApplicationError,
  GoogleConnectionService,
} from "./google-connection-service";
import { GOOGLE_DATA_SCOPES } from "./google-scopes";

function setup(stored: StoredGoogleConnection | null = null) {
  const repository: GoogleConnectionRepository = {
    findActiveByMemberId: vi.fn().mockResolvedValue(stored),
    revoke: vi.fn().mockResolvedValue(undefined),
    save: vi.fn().mockResolvedValue(undefined),
  };
  const oauth: GoogleOAuthGateway = {
    createAuthorizationUrl: vi.fn().mockReturnValue("https://accounts.google.com/auth"),
    exchangeAuthorizationCode: vi.fn().mockResolvedValue({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      scopes: GOOGLE_DATA_SCOPES,
    }),
    getIdentity: vi.fn().mockResolvedValue({
      email: "hello@vouga-agency.pt",
      emailVerified: true,
      subject: "google-subject",
    }),
    refreshAccessToken: vi.fn(),
    revokeToken: vi.fn().mockResolvedValue(undefined),
  };
  const tokenProtector: GoogleTokenProtector = {
    protect: vi.fn().mockResolvedValue({ ciphertext: "cipher", iv: "iv", keyVersion: 1 }),
    reveal: vi.fn().mockResolvedValue("refresh-token"),
  };
  const service = new GoogleConnectionService(
    repository,
    oauth,
    tokenProtector,
    () => new Date("2026-07-19T16:00:00.000Z"),
  );
  return { oauth, repository, service, tokenProtector };
}

describe("GoogleConnectionService", () => {
  test("troca o code, valida identidade e persiste apenas o token protegido", async () => {
    const { repository, service, tokenProtector } = setup();

    await service.completeAuthorization("member-1", "authorization-code");

    expect(tokenProtector.protect).toHaveBeenCalledWith("refresh-token");
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "hello@vouga-agency.pt",
        memberId: "member-1",
        providerSubject: "google-subject",
      }),
      { ciphertext: "cipher", iv: "iv", keyVersion: 1 },
    );
  });

  test("não guarda uma ligação sem refresh token", async () => {
    const { oauth, repository, service } = setup();
    vi.mocked(oauth.exchangeAuthorizationCode).mockResolvedValue({
      accessToken: "access-token",
      refreshToken: null,
      scopes: GOOGLE_DATA_SCOPES,
    });

    await expect(service.completeAuthorization("member-1", "code")).rejects.toBeInstanceOf(
      GoogleConnectionApplicationError,
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  test("remove a credencial local mesmo quando a revogação remota falha", async () => {
    const stored: StoredGoogleConnection = {
      connection: {
        connectedAt: "2026-07-19T15:00:00.000Z",
        email: "hello@vouga-agency.pt",
        memberId: "member-1",
        providerSubject: "google-subject",
        revokedAt: null,
        scopes: GOOGLE_DATA_SCOPES,
        status: "active",
        updatedAt: "2026-07-19T15:00:00.000Z",
      },
      refreshToken: { ciphertext: "cipher", iv: "iv", keyVersion: 1 },
    };
    const { oauth, repository, service } = setup(stored);
    vi.mocked(oauth.revokeToken).mockRejectedValue(new Error("Google unavailable"));

    await expect(service.disconnect("member-1")).resolves.toEqual({ remotelyRevoked: false });
    expect(repository.revoke).toHaveBeenCalledWith("member-1", "2026-07-19T16:00:00.000Z");
  });
});
