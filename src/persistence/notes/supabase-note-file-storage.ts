import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { NoteFileStorage } from "@/application/notes/contracts";
import { NoteApplicationError } from "@/application/notes/note-service";

const BUCKET = "notes-files";

export class SupabaseNoteFileStorage implements NoteFileStorage {
  constructor(private readonly supabase: SupabaseClient) {}

  async upload(path: string, file: Blob, mimeType: string): Promise<void> {
    const { error } = await this.supabase.storage.from(BUCKET).upload(path, file, {
      contentType: mimeType,
      upsert: false,
    });
    if (error) throw new NoteApplicationError("Não foi possível importar o ficheiro.");
  }

  async download(path: string): Promise<Blob> {
    const { data, error } = await this.supabase.storage.from(BUCKET).download(path);
    if (error || !data) throw new NoteApplicationError("Não foi possível abrir o ficheiro.");
    return data;
  }

  async remove(path: string): Promise<void> {
    const { error } = await this.supabase.storage.from(BUCKET).remove([path]);
    if (error) throw new NoteApplicationError("Não foi possível remover o ficheiro.");
  }
}
