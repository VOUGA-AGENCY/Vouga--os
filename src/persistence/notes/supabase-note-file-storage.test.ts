import { describe, expect, it, vi } from "vitest";

import { SupabaseNoteFileStorage } from "./supabase-note-file-storage";

describe("SupabaseNoteFileStorage", () => {
  it("creates a signed upload for direct browser-to-Storage transfer", async () => {
    const createSignedUploadUrl = vi
      .fn()
      .mockResolvedValue({ data: { token: "signed-token" }, error: null });
    const client = { storage: { from: vi.fn(() => ({ createSignedUploadUrl })) } };
    const storage = new SupabaseNoteFileStorage(client as never);

    await expect(storage.createSignedUpload("note/file.pdf")).resolves.toEqual({
      token: "signed-token",
    });

    expect(createSignedUploadUrl).toHaveBeenCalledWith("note/file.pdf");
  });

  it("explains a stale Storage size limit", async () => {
    const client = {
      storage: {
        from: vi.fn(() => ({
          createSignedUploadUrl: vi.fn().mockResolvedValue({
            data: null,
            error: { message: "The object exceeded the maximum allowed size" },
          }),
        })),
      },
    };
    const storage = new SupabaseNoteFileStorage(client as never);

    await expect(storage.createSignedUpload("note/file.pdf")).rejects.toThrow(
      "bucket notes-files está configurado para 10 MB",
    );
  });
});
