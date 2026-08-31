"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/application/auth/current-user";
import { getNoteErrorMessage } from "@/application/notes/note-service";
import { createGoogleNotesModule, createNotesModule } from "@/foundation/composition/notes";
import { canManageGoogle } from "@/foundation/security/google-access";
import { withFeedback } from "@/foundation/ui/feedback";

export async function createFolderAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  try {
    const id = await (await createNotesModule()).service.createFolder(
      user.id,
      String(formData.get("name") ?? ""),
      String(formData.get("color") ?? "amber"),
    );
    revalidatePath("/notes");
    redirect(withFeedback(`/notes?folder=${id}`, "Pasta criada."));
  } catch (error) {
    rethrowRedirect(error);
    redirect(withFeedback("/notes", getNoteErrorMessage(error), "error"));
  }
}

export async function createOsNoteAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  try {
    const id = await (await createNotesModule()).service.createOsNote(
      user.id,
      String(formData.get("title") ?? ""),
      optionalString(formData.get("folder_id")),
    );
    revalidatePath("/notes");
    redirect(withFeedback(`/notes?open=${id}`, "OS Note criada."));
  } catch (error) {
    rethrowRedirect(error);
    redirect(withFeedback("/notes", getNoteErrorMessage(error), "error"));
  }
}

export async function createGoogleDocumentAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!canManageGoogle(user.role)) {
    redirect(withFeedback("/notes", "Só Admin pode criar Google Notes.", "error"));
  }
  try {
    const id = await (await createGoogleNotesModule()).googleService.create(
      user.id,
      String(formData.get("title") ?? ""),
      optionalString(formData.get("folder_id")),
    );
    revalidatePath("/notes");
    redirect(withFeedback(`/notes?open=${id}`, "Google Note criada."));
  } catch (error) {
    rethrowRedirect(error);
    redirect(withFeedback("/notes", getNoteErrorMessage(error), "error"));
  }
}

async function requireUser() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");
  return user;
}

function optionalString(value: FormDataEntryValue | null): string | null {
  const string = typeof value === "string" ? value.trim() : "";
  return string || null;
}

function rethrowRedirect(error: unknown): void {
  if (error && typeof error === "object" && "digest" in error) throw error;
}
