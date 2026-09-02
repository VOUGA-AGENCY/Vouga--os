import {
  NOTE_UPLOAD_MAX_BYTES,
  NOTE_UPLOAD_MIME_TYPES,
  normalizeFolderName,
  normalizeNoteBody,
  normalizeNoteTitle,
  parseFolderColor,
} from "@/domain/notes/note";
import type { NoteFileStorage, NoteRepository } from "./contracts";

export class NoteApplicationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NoteApplicationError";
  }
}

export class NoteConflictError extends NoteApplicationError {
  constructor() {
    super("Esta nota foi atualizada noutro local. Reabre-a antes de continuar.");
    this.name = "NoteConflictError";
  }
}

export class NoteService {
  constructor(
    private readonly repository: NoteRepository,
    private readonly files: NoteFileStorage,
    private readonly id: () => string = () => crypto.randomUUID(),
  ) {}

  async getWorkspace() {
    const [folders, items] = await Promise.all([
      this.repository.listFolders(),
      this.repository.listItems(),
    ]);
    return { folders, items };
  }

  async createFolder(memberId: string, name: string, color: string): Promise<string> {
    const id = this.id();
    await this.repository.createFolder({
      color: parseFolderColor(color),
      id,
      memberId,
      name: normalizeFolderName(name),
    });
    return id;
  }

  async createOsNote(memberId: string, title: string, folderId: string | null): Promise<string> {
    const id = this.id();
    await this.repository.createItem({
      body: "",
      folderId: cleanId(folderId),
      id,
      kind: "os_note",
      memberId,
      title: normalizeNoteTitle(title),
    });
    return id;
  }

  async saveOsNote(values: {
    id: string;
    memberId: string;
    title: string;
    body: string;
    expectedVersion: number;
    folderId: string | null;
  }) {
    const current = await this.repository.findItem(values.id);
    if (!current || current.kind !== "os_note")
      throw new NoteApplicationError("Nota não encontrada.");
    return this.repository.updateItem({
      ...values,
      body: normalizeNoteBody(values.body),
      folderId: cleanId(values.folderId),
      title: normalizeNoteTitle(values.title),
    });
  }

  async saveUploadMetadata(values: {
    id: string;
    memberId: string;
    title: string;
    folderId: string | null;
    expectedVersion: number;
  }) {
    const current = await this.repository.findItem(values.id);
    if (!current || current.kind !== "upload")
      throw new NoteApplicationError("Documento não encontrado.");
    return this.repository.updateItemMetadata({
      ...values,
      folderId: cleanId(values.folderId),
      title: normalizeNoteTitle(values.title),
    });
  }

  async renameFolder(id: string, name: string): Promise<void> {
    await this.repository.updateFolder(id, { name: normalizeFolderName(name) });
  }

  async moveItem(id: string, folderId: string | null, memberId: string): Promise<void> {
    await this.repository.moveItem(id, cleanId(folderId), memberId);
  }

  async deleteFolder(id: string): Promise<void> {
    await this.repository.deleteFolder(id);
  }

  async deleteItem(id: string): Promise<void> {
    const item = await this.repository.findItem(id);
    if (!item) throw new NoteApplicationError("Documento não encontrado.");
    if (item.kind === "google_doc") {
      throw new NoteApplicationError("Elimina Google Notes através da integração Google.");
    }
    if (item.kind === "upload" && item.storagePath) {
      await this.files.remove(item.storagePath);
    }
    await this.repository.deleteItem(id);
  }

  async prepareFileImport(values: {
    memberId: string;
    folderId: string | null;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
  }): Promise<{ id: string; path: string; token: string }> {
    validateImport(values);
    const id = this.id();
    const path = `${id}/${safeFileName(values.fileName)}`;
    const { token } = await this.files.createSignedUpload(path);
    return { id, path, token };
  }

  async completeFileImport(values: {
    id: string;
    memberId: string;
    folderId: string | null;
    fileName: string;
    mimeType: string;
    path: string;
    sizeBytes: number;
  }): Promise<string> {
    validateImport(values);
    const expectedPath = `${values.id}/${safeFileName(values.fileName)}`;
    if (values.path !== expectedPath)
      throw new NoteApplicationError("O upload preparado não é válido.");
    const existing = await this.repository.findItem(values.id);
    if (existing) {
      if (existing.kind === "upload" && existing.storagePath === values.path) return existing.id;
      throw new NoteApplicationError("O documento já existe com outra origem.");
    }
    await this.repository.createItem({
      body: null,
      folderId: cleanId(values.folderId),
      id: values.id,
      kind: "upload",
      memberId: values.memberId,
      mimeType: values.mimeType,
      originalFileName: values.fileName,
      sizeBytes: values.sizeBytes,
      storagePath: values.path,
      title: normalizeNoteTitle(values.fileName.replace(/\.[^.]+$/, "") || values.fileName),
    });
    return values.id;
  }
}

function validateImport(values: { fileName: string; mimeType: string; sizeBytes: number }) {
  if (
    !NOTE_UPLOAD_MIME_TYPES.includes(values.mimeType as (typeof NOTE_UPLOAD_MIME_TYPES)[number])
  ) {
    throw new NoteApplicationError("Importa um PDF, PNG, JPEG ou DOCX.");
  }
  if (values.sizeBytes < 1 || values.sizeBytes > NOTE_UPLOAD_MAX_BYTES) {
    throw new NoteApplicationError("O ficheiro deve ter no máximo 10 MB.");
  }
}

function safeFileName(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-120) || "file";
}

function cleanId(value: string | null): string | null {
  return value?.trim() || null;
}

export function getNoteErrorMessage(error: unknown): string {
  if (error instanceof NoteApplicationError) return error.message;
  if (error instanceof Error && error.name === "InvalidNoteError") return error.message;
  return "Não foi possível guardar nas Notes.";
}
