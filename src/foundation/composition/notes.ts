import "server-only";

import { NoteService } from "@/application/notes/note-service";
import { SupabaseNoteFileStorage } from "@/persistence/notes/supabase-note-file-storage";
import { SupabaseNoteRepository } from "@/persistence/notes/supabase-note-repository";
import { createClient } from "@/persistence/supabase/server";

export async function createNotesModule() {
  const supabase = await createClient();
  const repository = new SupabaseNoteRepository(supabase);
  const files = new SupabaseNoteFileStorage(supabase);
  return {
    files,
    repository,
    service: new NoteService(repository, files),
  };
}

export async function createGoogleNotesModule() {
  const [{ repository }, google] = await Promise.all([
    createNotesModule(),
    import("./google").then(({ createGoogleIntegrationModule }) => createGoogleIntegrationModule()),
  ]);
  const { GoogleNoteService } = await import("@/application/notes/google-note-service");
  return { googleService: new GoogleNoteService(repository, google.documentService), repository };
}
