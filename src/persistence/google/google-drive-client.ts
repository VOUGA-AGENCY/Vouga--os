import "server-only";

import type {
  GoogleDocumentContent,
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

type DocsDocument = {
  documentId?: unknown;
  title?: unknown;
  revisionId?: unknown;
  body?: { content?: unknown };
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

export class GoogleDocumentConflictError extends GoogleDriveRequestError {
  constructor() {
    super();
    this.name = "GoogleDocumentConflictError";
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

  async getDocument(accessToken: string, documentId: string): Promise<GoogleDriveDocument> {
    const url = new URL(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(documentId)}`);
    url.searchParams.set("fields", DOCUMENT_FIELDS);
    const response = await this.fetcher(url, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(15_000),
    });
    const body = (await response.json().catch(() => null)) as DriveFile | null;
    const document = body ? toGoogleDriveDocument(body) : null;
    if (!response.ok || !document) throw new GoogleDriveRequestError();
    return document;
  }

  async getDocumentContent(accessToken: string, documentId: string): Promise<GoogleDocumentContent> {
    const response = await this.fetcher(
      `https://docs.googleapis.com/v1/documents/${encodeURIComponent(documentId)}`,
      {
        cache: "no-store",
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(15_000),
      },
    );
    const body = (await response.json().catch(() => null)) as DocsDocument | null;
    const content = body ? toDocumentContent(body) : null;
    if (!response.ok || !content) throw new GoogleDriveRequestError();
    return content;
  }

  async trashDocument(accessToken: string, documentId: string): Promise<void> {
    const response = await this.fetcher(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(documentId)}`,
      {
        body: JSON.stringify({ trashed: true }),
        headers: googleHeaders(accessToken),
        method: "PATCH",
        signal: AbortSignal.timeout(15_000),
      },
    );
    if (!response.ok) throw new GoogleDriveRequestError();
  }

  async replaceDocumentContent(
    accessToken: string,
    values: Readonly<{
      documentId: string;
      title: string;
      text: string;
      requiredRevisionId: string;
      endIndex: number;
    }>,
  ): Promise<GoogleDocumentContent> {
    const requests: object[] = [];
    if (values.endIndex > 2) {
      requests.push({ deleteContentRange: { range: { endIndex: values.endIndex - 1, startIndex: 1 } } });
    }
    if (values.text) requests.push({ insertText: { location: { index: 1 }, text: values.text } });
    const response = await this.fetcher(
      `https://docs.googleapis.com/v1/documents/${encodeURIComponent(values.documentId)}:batchUpdate`,
      {
        body: JSON.stringify({ requests, writeControl: { requiredRevisionId: values.requiredRevisionId } }),
        headers: googleHeaders(accessToken),
        method: "POST",
        signal: AbortSignal.timeout(15_000),
      },
    );
    if (response.status === 400) throw new GoogleDocumentConflictError();
    if (!response.ok) throw new GoogleDriveRequestError();

    const titleResponse = await this.fetcher(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(values.documentId)}?fields=${encodeURIComponent(DOCUMENT_FIELDS)}`,
      {
        body: JSON.stringify({ name: values.title }),
        headers: googleHeaders(accessToken),
        method: "PATCH",
        signal: AbortSignal.timeout(15_000),
      },
    );
    if (!titleResponse.ok) throw new GoogleDriveRequestError();
    return this.getDocumentContent(accessToken, values.documentId);
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

function toDocumentContent(document: DocsDocument): GoogleDocumentContent | null {
  if (
    typeof document.documentId !== "string" ||
    typeof document.title !== "string" ||
    typeof document.revisionId !== "string" ||
    !Array.isArray(document.body?.content)
  ) return null;
  const content = document.body.content as Array<{
    endIndex?: unknown;
    paragraph?: { elements?: Array<{ textRun?: { content?: unknown } }> };
  }>;
  const text = content
    .flatMap((element) => element.paragraph?.elements ?? [])
    .map((element) => element.textRun?.content)
    .filter((value): value is string => typeof value === "string")
    .join("")
    .replace(/\n$/, "");
  const endIndex = content.reduce((largest, element) =>
    typeof element.endIndex === "number" ? Math.max(largest, element.endIndex) : largest, 1);
  return {
    documentId: document.documentId,
    endIndex,
    revisionId: document.revisionId,
    text,
    title: document.title.trim() || "Sem título",
  };
}
