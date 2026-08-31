import type { GoogleDriveDocumentService } from "@/application/google/google-drive-document-service";
import { normalizeNoteBody, normalizeNoteTitle } from "@/domain/notes/note";
import { GoogleDocumentConflictError } from "@/persistence/google/google-drive-client";
import type { NoteRepository } from "./contracts";
import { NoteApplicationError, NoteConflictError } from "./note-service";

export class GoogleNoteService {
  constructor(
    private readonly repository: NoteRepository,
    private readonly google: GoogleDriveDocumentService,
    private readonly id: () => string = () => crypto.randomUUID(),
  ) {}

  async create(memberId: string, title: string, folderId: string | null): Promise<string> {
    const normalizedTitle = normalizeNoteTitle(title);
    const document = await this.google.createDocument(memberId, normalizedTitle);
    const content = await this.google.getDocumentContent(memberId, document.id);
    const id = this.id();
    await this.repository.createItem({
      body: content.text,
      folderId: folderId?.trim() || null,
      googleDocumentId: document.id,
      googleHtmlLink: document.htmlLink,
      googleModifiedAt: document.modifiedAt,
      googleOwnerMemberId: memberId,
      googleRevisionId: content.revisionId,
      id,
      kind: "google_doc",
      memberId,
      title: content.title,
    });
    return id;
  }

  async import(memberId: string, documentId: string, folderId: string | null): Promise<string> {
    const [document, content] = await Promise.all([
      this.google.getDocument(memberId, documentId),
      this.google.getDocumentContent(memberId, documentId),
    ]);
    const id = this.id();
    await this.repository.createItem({
      body: content.text,
      folderId: folderId?.trim() || null,
      googleDocumentId: document.id,
      googleHtmlLink: document.htmlLink,
      googleModifiedAt: document.modifiedAt,
      googleOwnerMemberId: memberId,
      googleRevisionId: content.revisionId,
      id,
      kind: "google_doc",
      memberId,
      title: content.title,
    });
    return id;
  }

  async sync(memberId: string, noteId: string) {
    const note = await this.requireOwnedGoogleNote(memberId, noteId);
    const content = await this.google.getDocumentContent(memberId, note.googleDocumentId!);
    if (
      content.revisionId === note.googleRevisionId &&
      content.title === note.title &&
      content.text === note.body
    ) return note;
    return this.repository.updateItem({
      body: content.text,
      expectedVersion: note.version,
      googleModifiedAt: new Date().toISOString(),
      googleRevisionId: content.revisionId,
      id: note.id,
      memberId,
      title: content.title,
    });
  }

  async save(values: {
    memberId: string;
    noteId: string;
    title: string;
    body: string;
    expectedVersion: number;
    expectedGoogleRevisionId: string;
    folderId: string | null;
  }) {
    const note = await this.requireOwnedGoogleNote(values.memberId, values.noteId);
    if (note.version !== values.expectedVersion) throw new NoteConflictError();
    const remote = await this.google.getDocumentContent(values.memberId, note.googleDocumentId!);
    if (remote.revisionId !== values.expectedGoogleRevisionId) {
      throw new NoteConflictError();
    }
    try {
      const saved = await this.google.replaceDocumentContent(values.memberId, {
        documentId: note.googleDocumentId!,
        endIndex: remote.endIndex,
        requiredRevisionId: remote.revisionId,
        text: normalizeNoteBody(values.body),
        title: normalizeNoteTitle(values.title),
      });
      return this.repository.updateItem({
        body: saved.text,
        expectedVersion: note.version,
        folderId: values.folderId?.trim() || null,
        googleModifiedAt: new Date().toISOString(),
        googleRevisionId: saved.revisionId,
        id: note.id,
        memberId: values.memberId,
        title: saved.title,
      });
    } catch (error) {
      if (error instanceof GoogleDocumentConflictError) throw new NoteConflictError();
      throw error;
    }
  }

  async delete(memberId: string, noteId: string): Promise<void> {
    const note = await this.requireOwnedGoogleNote(memberId, noteId);
    await this.google.trashDocument(memberId, note.googleDocumentId!);
    await this.repository.deleteItem(note.id);
  }

  private async requireOwnedGoogleNote(memberId: string, noteId: string) {
    const note = await this.repository.findItem(noteId);
    if (!note || note.kind !== "google_doc") throw new NoteApplicationError("Google Note não encontrada.");
    if (note.googleOwnerMemberId !== memberId) {
      throw new NoteApplicationError("Só Admin pode sincronizar esta Google Note.");
    }
    return note;
  }
}
