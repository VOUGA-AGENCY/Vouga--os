import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { NoteFileStorage } from "@/application/notes/contracts";
import { NoteApplicationError } from "@/application/notes/note-service";

const BUCKET = "notes-files";

export class SupabaseNoteFileStorage implements NoteFileStorage {
  constructor(private readonly supabase: SupabaseClient) {}

  async createSignedUpload(path: string): Promise<{ token: string }> {
    const { data, error } = await this.supabase.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error || !data?.token) {
      throw new NoteApplicationError(
        uploadErrorMessage(error?.message ?? "Não foi possível preparar o upload."),
      );
    }
    return { token: data.token };
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

function uploadErrorMessage(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes("maximum allowed size") || normalized.includes("entity too large")) {
    return "O Storage recusou o tamanho do ficheiro. Confirma que o bucket notes-files está configurado para 10 MB.";
  }
  if (normalized.includes("bucket not found")) {
    return "O bucket notes-files ainda não está disponível no Supabase.";
  }
  if (normalized.includes("row-level security") || normalized.includes("unauthorized")) {
    return "A sessão atual não tem permissão para importar ficheiros nas Notes.";
  }
  return `O Supabase Storage recusou o ficheiro: ${message}`;
}
