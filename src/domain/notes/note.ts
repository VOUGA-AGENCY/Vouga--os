export const NOTE_FOLDER_COLORS = ["amber", "blue", "green", "rose", "violet", "graphite"] as const;
export const NOTE_UPLOAD_MAX_BYTES = 10_485_760;
export const NOTE_UPLOAD_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;
export type NoteFolderColor = (typeof NOTE_FOLDER_COLORS)[number];
export type NoteKind = "os_note" | "google_doc" | "upload";

export type NoteFolder = Readonly<{
  id: string;
  name: string;
  color: NoteFolderColor;
  createdAt: string;
  updatedAt: string;
}>;

export type NoteItem = Readonly<{
  id: string;
  folderId: string | null;
  kind: NoteKind;
  title: string;
  body: string | null;
  googleDocumentId: string | null;
  googleHtmlLink: string | null;
  googleOwnerMemberId: string | null;
  googleRevisionId: string | null;
  googleModifiedAt: string | null;
  storagePath: string | null;
  originalFileName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}>;

export class InvalidNoteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidNoteError";
  }
}

export function normalizeFolderName(value: string): string {
  const name = value.trim().replace(/\s+/g, " ");
  if (!name) throw new InvalidNoteError("Dá um nome à pasta.");
  if (name.length > 80) throw new InvalidNoteError("O nome da pasta é demasiado longo.");
  return name;
}

export function parseFolderColor(value: string): NoteFolderColor {
  if (!NOTE_FOLDER_COLORS.includes(value as NoteFolderColor)) {
    throw new InvalidNoteError("Escolhe uma cor válida.");
  }
  return value as NoteFolderColor;
}

export function normalizeNoteTitle(value: string): string {
  const title = value.trim().replace(/\s+/g, " ");
  if (!title) throw new InvalidNoteError("Dá um título à nota.");
  if (title.length > 180) throw new InvalidNoteError("O título é demasiado longo.");
  return title;
}

export function normalizeNoteBody(value: string): string {
  if (value.length > 200_000) throw new InvalidNoteError("A nota é demasiado longa.");
  return value.replaceAll("\r\n", "\n");
}
