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
    if (!current || current.kind !== "os_note") throw new NoteApplicationError("Nota não encontrada.");
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
    if (!current || current.kind !== "upload") throw new NoteApplicationError("Documento não encontrado.");
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

  async importFile(values: {
    memberId: string;
    folderId: string | null;
    file: File;
  }): Promise<string> {
    const { file } = values;
    if (!NOTE_UPLOAD_MIME_TYPES.includes(file.type as (typeof NOTE_UPLOAD_MIME_TYPES)[number])) {
      throw new NoteApplicationError("Importa um PDF, PNG, JPEG ou DOCX.");
    }
    if (file.size < 1 || file.size > NOTE_UPLOAD_MAX_BYTES) {
      throw new NoteApplicationError("O ficheiro deve ter no máximo 10 MB.");
    }
    const id = this.id();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-120) || "file";
    const path = `${id}/${safeName}`;
    await this.files.upload(path, file, file.type);
    try {
      await this.repository.createItem({
        body: null,
        folderId: cleanId(values.folderId),
        id,
        kind: "upload",
        memberId: values.memberId,
        mimeType: file.type,
        originalFileName: file.name,
        sizeBytes: file.size,
        storagePath: path,
        title: normalizeNoteTitle(file.name.replace(/\.[^.]+$/, "") || file.name),
      });
    } catch (error) {
      await this.files.remove(path).catch(() => undefined);
      throw error;
    }
    return id;
  }
}

function cleanId(value: string | null): string | null {
  return value?.trim() || null;
}

export function getNoteErrorMessage(error: unknown): string {
  if (error instanceof NoteApplicationError) return error.message;
  if (error instanceof Error && error.name === "InvalidNoteError") return error.message;
  return "Não foi possível guardar nas Notes.";
}
