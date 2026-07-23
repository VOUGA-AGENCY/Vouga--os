import "server-only";

import type {
  GoogleDriveDocument,
  GoogleDriveDocumentGateway,
} from "@/application/google/contracts";

type Fetcher = typeof fetch;

type DriveFile = {
  createdTime?: unknown;
  id?: unknown;
  mimeType?: unknown;
  modifiedTime?: unknown;
  name?: unknown;
  webViewLink?: unknown;
};

const GOOGLE_DOC_MIME_TYPE = "application/vnd.google-apps.document";
const DRIVE_FIELDS = "files(id,name,webViewLink,createdTime,modifiedTime,mimeType)";
const DOCUMENT_FIELDS = "id,name,webViewLink,createdTime,modifiedTime,mimeType";

export class GoogleDriveRequestError extends Error {
  constructor() {
    super("Não foi possível carregar os documentos Google.");
    this.name = "GoogleDriveRequestError";
  }
}

export class GoogleDriveClient implements GoogleDriveDocumentGateway {
  constructor(private readonly fetcher: Fetcher = fetch) {}

  async createDocument(accessToken: string, title: string): Promise<GoogleDriveDocument> {
    const url = new URL("https://www.googleapis.com/drive/v3/files");
    url.searchParams.set("fields", DOCUMENT_FIELDS);
    const response = await this.fetcher(url, {
      body: JSON.stringify({
        mimeType: GOOGLE_DOC_MIME_TYPE,
        name: title,
      }),
      cache: "no-store",
      headers: googleHeaders(accessToken),
      method: "POST",
      signal: AbortSignal.timeout(15_000),
    });
    const body = (await response.json().catch(() => null)) as DriveFile | null;
    const document = body ? toGoogleDriveDocument(body) : null;
    if (!response.ok || !document) throw new GoogleDriveRequestError();
    return document;
  }

  async listDocuments(accessToken: string, query: string | null): Promise<GoogleDriveDocument[]> {
    const url = new URL("https://www.googleapis.com/drive/v3/files");
    url.searchParams.set("fields", DRIVE_FIELDS);
    url.searchParams.set("orderBy", "modifiedTime desc");
    url.searchParams.set("pageSize", "25");
    url.searchParams.set("spaces", "drive");
    url.searchParams.set("q", driveQuery(query));

    const response = await this.fetcher(url, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(15_000),
    });
    const body = (await response.json().catch(() => null)) as { files?: unknown } | null;
    if (!response.ok || !Array.isArray(body?.files)) throw new GoogleDriveRequestError();

    return (body.files as DriveFile[])
      .map((file) => toGoogleDriveDocument(file))
      .filter((file): file is GoogleDriveDocument => Boolean(file));
  }
}

function driveQuery(query: string | null): string {
  const parts = [`mimeType = '${GOOGLE_DOC_MIME_TYPE}'`, "trashed = false"];
  if (query) parts.push(`name contains '${escapeDriveQueryValue(query)}'`);
  return parts.join(" and ");
}

function escapeDriveQueryValue(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("'", "\\'");
}

function googleHeaders(accessToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}

function toGoogleDriveDocument(file: DriveFile): GoogleDriveDocument | null {
  if (
    typeof file.id !== "string" ||
    typeof file.name !== "string" ||
    file.mimeType !== GOOGLE_DOC_MIME_TYPE
  ) {
    return null;
  }
  return {
    createdAt: typeof file.createdTime === "string" ? file.createdTime : null,
    htmlLink:
      typeof file.webViewLink === "string"
        ? file.webViewLink
        : `https://docs.google.com/document/d/${encodeURIComponent(file.id)}/edit`,
    id: file.id,
    modifiedAt: typeof file.modifiedTime === "string" ? file.modifiedTime : null,
    title: file.name.trim() || "Sem título",
  };
}
