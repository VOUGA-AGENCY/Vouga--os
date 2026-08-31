import { describe, expect, test, vi } from "vitest";
import type { GoogleDriveDocumentService } from "@/application/google/google-drive-document-service";
import type { NoteRepository } from "./contracts";
import { GoogleNoteService } from "./google-note-service";
import { NoteConflictError } from "./note-service";

function setup() {
  const note = {
    body: "Old", createdAt: "2026-08-31T10:00:00Z", folderId: null,
    googleDocumentId: "doc-1", googleHtmlLink: "https://docs.google.com/doc-1",
    googleModifiedAt: null, googleOwnerMemberId: "admin-1", googleRevisionId: "rev-1",
    id: "note-1", kind: "google_doc" as const, mimeType: null, originalFileName: null,
    sizeBytes: null, storagePath: null, title: "Title", updatedAt: "2026-08-31T10:00:00Z", version: 1,
  };
  const repository: NoteRepository = {
    createFolder: vi.fn(), createItem: vi.fn(), deleteFolder: vi.fn(), deleteItem: vi.fn(),
    findItem: vi.fn().mockResolvedValue(note), listFolders: vi.fn(), listItems: vi.fn(), moveItem: vi.fn(),
    updateFolder: vi.fn(), updateItem: vi.fn().mockImplementation(async (values) => ({
      ...note, body: values.body, googleRevisionId: values.googleRevisionId ?? note.googleRevisionId,
      title: values.title, version: values.expectedVersion + 1,
    })), updateItemMetadata: vi.fn(),
  };
  const google = {
    createDocument: vi.fn().mockResolvedValue({ id: "doc-1", htmlLink: "https://docs.google.com/doc-1", modifiedAt: null }),
    getDocument: vi.fn(),
    getDocumentContent: vi.fn().mockResolvedValue({ documentId: "doc-1", endIndex: 5, revisionId: "rev-1", text: "Old", title: "Title" }),
    replaceDocumentContent: vi.fn().mockResolvedValue({ documentId: "doc-1", endIndex: 5, revisionId: "rev-2", text: "New", title: "New title" }),
    trashDocument: vi.fn(),
  } as unknown as GoogleDriveDocumentService;
  return { google, note, repository, service: new GoogleNoteService(repository, google, () => "note-1") };
}

describe("GoogleNoteService", () => {
  test("writes Google first and only then advances the local projection", async () => {
    const { google, repository, service } = setup();
    await service.save({ body: "New", expectedGoogleRevisionId: "rev-1", expectedVersion: 1,
      folderId: "folder-1", memberId: "admin-1", noteId: "note-1", title: "New title" });
    expect(google.replaceDocumentContent).toHaveBeenCalledWith("admin-1", expect.objectContaining({
      requiredRevisionId: "rev-1", text: "New",
    }));
    expect(repository.updateItem).toHaveBeenCalledWith(expect.objectContaining({
      folderId: "folder-1", googleRevisionId: "rev-2",
    }));
  });

  test("stops when Google changed since the editor read the document", async () => {
    const { google, service } = setup();
    vi.mocked(google.getDocumentContent).mockResolvedValue({
      documentId: "doc-1", endIndex: 8, revisionId: "rev-external", text: "External", title: "Title",
    });
    await expect(service.save({ body: "New", expectedGoogleRevisionId: "rev-1", expectedVersion: 1,
      folderId: null, memberId: "admin-1", noteId: "note-1", title: "Title" })).rejects.toBeInstanceOf(NoteConflictError);
    expect(google.replaceDocumentContent).not.toHaveBeenCalled();
  });

  test("does not let another member use the owning Google connection", async () => {
    const { service } = setup();
    await expect(service.sync("engineer-1", "note-1")).rejects.toThrow("Só Admin");
  });

  test("moves the Google document to trash before deleting its local projection", async () => {
    const { google, repository, service } = setup();

    await service.delete("admin-1", "note-1");

    expect(google.trashDocument).toHaveBeenCalledWith("admin-1", "doc-1");
    expect(repository.deleteItem).toHaveBeenCalledWith("note-1");
    expect(vi.mocked(google.trashDocument).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(repository.deleteItem).mock.invocationCallOrder[0],
    );
  });
});
