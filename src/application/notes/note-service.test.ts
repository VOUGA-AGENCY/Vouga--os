import { describe, expect, test, vi } from "vitest";
import type { NoteFileStorage, NoteRepository } from "./contracts";
import { NOTE_UPLOAD_MAX_BYTES } from "@/domain/notes/note";
import { NoteService } from "./note-service";

function setup() {
  const repository: NoteRepository = {
    createFolder: vi.fn(),
    createItem: vi.fn(),
    deleteFolder: vi.fn(),
    deleteItem: vi.fn(),
    findItem: vi.fn(),
    listFolders: vi.fn().mockResolvedValue([]),
    listItems: vi.fn().mockResolvedValue([]),
    moveItem: vi.fn(),
    updateFolder: vi.fn(),
    updateItem: vi.fn(),
    updateItemMetadata: vi.fn(),
  };
  const files: NoteFileStorage = {
    createSignedUpload: vi.fn().mockResolvedValue({ token: "signed-token" }),
    download: vi.fn(),
    remove: vi.fn(),
  };
  return { files, repository, service: new NoteService(repository, files, () => "note-id") };
}

describe("NoteService", () => {
  test("creates shared OS notes without Google fields", async () => {
    const { repository, service } = setup();
    await service.createOsNote("member-1", " Quick note ", "folder-1");
    expect(repository.createItem).toHaveBeenCalledWith(
      expect.objectContaining({
        body: "",
        folderId: "folder-1",
        id: "note-id",
        kind: "os_note",
        title: "Quick note",
      }),
    );
  });

  test("rejects unsupported or oversized uploads before storage", async () => {
    const { files, service } = setup();
    await expect(
      service.prepareFileImport({
        fileName: "bad.txt",
        mimeType: "text/plain",
        sizeBytes: 1,
        folderId: null,
        memberId: "member-1",
      }),
    ).rejects.toThrow("PDF, PNG, JPEG ou DOCX");
    await expect(
      service.prepareFileImport({
        fileName: "large.pdf",
        mimeType: "application/pdf",
        sizeBytes: NOTE_UPLOAD_MAX_BYTES + 1,
        folderId: null,
        memberId: "member-1",
      }),
    ).rejects.toThrow("10 MB");
    expect(files.createSignedUpload).not.toHaveBeenCalled();
  });

  test("accepts a PDF larger than the former 4 MB limit and assigns it to a folder", async () => {
    const { files, repository, service } = setup();
    const prepared = await service.prepareFileImport({
      fileName: "brief.pdf",
      mimeType: "application/pdf",
      sizeBytes: 6_400_000,
      folderId: "folder-1",
      memberId: "member-1",
    });
    await service.completeFileImport({
      ...prepared,
      fileName: "brief.pdf",
      mimeType: "application/pdf",
      sizeBytes: 6_400_000,
      folderId: "folder-1",
      memberId: "member-1",
    });

    expect(files.createSignedUpload).toHaveBeenCalledWith("note-id/brief.pdf");
    expect(repository.createItem).toHaveBeenCalledWith(
      expect.objectContaining({
        folderId: "folder-1",
        kind: "upload",
        sizeBytes: 6_400_000,
        title: "brief",
      }),
    );
  });

  test("removes an uploaded file before deleting its projection", async () => {
    const { files, repository, service } = setup();
    vi.mocked(repository.findItem).mockResolvedValue({
      body: null,
      createdAt: "2026-08-31T10:00:00Z",
      folderId: "folder-1",
      googleDocumentId: null,
      googleHtmlLink: null,
      googleModifiedAt: null,
      googleOwnerMemberId: null,
      googleRevisionId: null,
      id: "upload-1",
      kind: "upload",
      mimeType: "application/pdf",
      originalFileName: "brief.pdf",
      sizeBytes: 1200,
      storagePath: "upload-1/brief.pdf",
      title: "Brief",
      updatedAt: "2026-08-31T10:00:00Z",
      version: 1,
    });

    await service.deleteItem("upload-1");

    expect(files.remove).toHaveBeenCalledWith("upload-1/brief.pdf");
    expect(repository.deleteItem).toHaveBeenCalledWith("upload-1");
    expect(vi.mocked(files.remove).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(repository.deleteItem).mock.invocationCallOrder[0],
    );
  });

  test("renames folders and updates upload metadata through existing repositories", async () => {
    const { repository, service } = setup();
    vi.mocked(repository.findItem).mockResolvedValue({
      body: null,
      createdAt: "2026-08-31T10:00:00Z",
      folderId: null,
      googleDocumentId: null,
      googleHtmlLink: null,
      googleModifiedAt: null,
      googleOwnerMemberId: null,
      googleRevisionId: null,
      id: "upload-1",
      kind: "upload",
      mimeType: "application/pdf",
      originalFileName: "brief.pdf",
      sizeBytes: 1200,
      storagePath: "upload-1/brief.pdf",
      title: "Brief",
      updatedAt: "2026-08-31T10:00:00Z",
      version: 1,
    });

    await service.renameFolder("folder-1", "  Client   docs  ");
    await service.saveUploadMetadata({
      expectedVersion: 1,
      folderId: "folder-1",
      id: "upload-1",
      memberId: "member-1",
      title: "  Brief final  ",
    });

    expect(repository.updateFolder).toHaveBeenCalledWith("folder-1", { name: "Client docs" });
    expect(repository.updateItemMetadata).toHaveBeenCalledWith(
      expect.objectContaining({
        folderId: "folder-1",
        title: "Brief final",
      }),
    );
  });
});
