import { describe, expect, test, vi } from "vitest";

import type {
  GoogleConnectionRepository,
  GoogleDriveDocumentGateway,
  GoogleOAuthGateway,
  GoogleTokenProtector,
  StoredGoogleConnection,
} from "./contracts";
import {
  GoogleDriveDocumentError,
  GoogleDriveDocumentService,
} from "./google-drive-document-service";
import { GOOGLE_DATA_SCOPES } from "./google-scopes";

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

function setup(connection: StoredGoogleConnection | null = stored) {
  const repository: GoogleConnectionRepository = {
    findActiveByMemberId: vi.fn().mockResolvedValue(connection),
    revoke: vi.fn(),
    save: vi.fn(),
  };
  const oauth: GoogleOAuthGateway = {
    createAuthorizationUrl: vi.fn(),
    exchangeAuthorizationCode: vi.fn(),
    getIdentity: vi.fn(),
    refreshAccessToken: vi.fn().mockResolvedValue("access-token"),
    revokeToken: vi.fn(),
  };
  const documents: GoogleDriveDocumentGateway = {
    createDocument: vi.fn().mockResolvedValue({
      createdAt: "2026-07-23T12:00:00.000Z",
      htmlLink: "https://docs.google.com/document/d/doc-1/edit",
      id: "doc-1",
      modifiedAt: "2026-07-23T12:00:00.000Z",
      title: "Founder notes",
    }),
    listDocuments: vi.fn().mockResolvedValue([]),
  };
  const tokenProtector: GoogleTokenProtector = {
    protect: vi.fn(),
    reveal: vi.fn().mockResolvedValue("refresh-token"),
  };
  const service = new GoogleDriveDocumentService(
    repository,
    oauth,
    documents,
    tokenProtector,
  );
  return { documents, service };
}

describe("GoogleDriveDocumentService", () => {
  test("lista Docs via token Google protegido sem persistir conteúdo", async () => {
    const { documents, service } = setup();

    await service.listDocuments("member-1", " pitch ");

    expect(documents.listDocuments).toHaveBeenCalledWith("access-token", "pitch");
  });

  test("cria documento Google com título normalizado", async () => {
    const { documents, service } = setup();

    await expect(service.createDocument("member-1", " Founder notes ")).resolves.toMatchObject({
      id: "doc-1",
      title: "Founder notes",
    });
    expect(documents.createDocument).toHaveBeenCalledWith("access-token", "Founder notes");
  });

  test("falha sem ligação Google ativa", async () => {
    const { service } = setup(null);

    await expect(service.listDocuments("member-1", null)).rejects.toBeInstanceOf(
      GoogleDriveDocumentError,
    );
  });
});
