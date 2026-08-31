import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/application/auth/current-user";
import { getNoteErrorMessage, NoteApplicationError } from "@/application/notes/note-service";
import { createGoogleNotesModule, createNotesModule } from "@/foundation/composition/notes";
import { canManageGoogle } from "@/foundation/security/google-access";

export async function GET(_request: Request, context: { params: Promise<{ noteId: string }> }) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const { noteId } = await context.params;
  try {
    const { repository } = await createNotesModule();
    let note = await repository.findItem(noteId);
    if (!note) return NextResponse.json({ error: "Nota não encontrada." }, { status: 404 });
    if (note.kind === "google_doc" && canManageGoogle(user.role) && note.googleOwnerMemberId === user.id) {
      note = await (await createGoogleNotesModule()).googleService.sync(user.id, noteId);
    }
    return NextResponse.json({ note });
  } catch (error) {
    return NextResponse.json({ error: getNoteErrorMessage(error) }, { status: 400 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ noteId: string }> }) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const { noteId } = await context.params;
  const values = (await request.json().catch(() => null)) as {
    action?: unknown; body?: unknown; expectedGoogleRevisionId?: unknown;
    expectedVersion?: unknown; folderId?: unknown; title?: unknown;
  } | null;
  try {
    const notesModule = await createNotesModule();
    const note = await notesModule.repository.findItem(noteId);
    if (!note) return NextResponse.json({ error: "Nota não encontrada." }, { status: 404 });
    if (values?.action === "move") {
      if (note.kind === "google_doc" && !canManageGoogle(user.role)) {
        throw new NoteApplicationError("Só Admin pode editar Google Notes.");
      }
      await notesModule.service.moveItem(noteId, typeof values.folderId === "string" ? values.folderId : null, user.id);
      return NextResponse.json({ ok: true });
    }
    if (values?.action === "metadata") {
      if (note.kind !== "upload") throw new NoteApplicationError("Edição inválida.");
      if (typeof values.title !== "string" || typeof values.expectedVersion !== "number") {
        throw new NoteApplicationError("Edição inválida.");
      }
      const saved = await notesModule.service.saveUploadMetadata({
        expectedVersion: values.expectedVersion,
        folderId: typeof values.folderId === "string" ? values.folderId : null,
        id: noteId,
        memberId: user.id,
        title: values.title,
      });
      return NextResponse.json({ note: saved });
    }
    if (typeof values?.title !== "string" || typeof values.body !== "string" || typeof values.expectedVersion !== "number") {
      return NextResponse.json({ error: "Edição inválida." }, { status: 400 });
    }
    const saved = note.kind === "google_doc"
      ? await saveGoogleNote(user, noteId, values)
      : await notesModule.service.saveOsNote({
          body: values.body, expectedVersion: values.expectedVersion, id: noteId,
          folderId: typeof values.folderId === "string" ? values.folderId : null,
          memberId: user.id, title: values.title,
        });
    return NextResponse.json({ note: saved });
  } catch (error) {
    return NextResponse.json({ error: getNoteErrorMessage(error) }, { status: 409 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ noteId: string }> }) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Só Admin pode eliminar documentos." }, { status: 403 });
  }
  const { noteId } = await context.params;
  try {
    const notesModule = await createNotesModule();
    const note = await notesModule.repository.findItem(noteId);
    if (!note) return NextResponse.json({ error: "Documento não encontrado." }, { status: 404 });
    if (note.kind === "google_doc") {
      await (await createGoogleNotesModule()).googleService.delete(user.id, noteId);
    } else {
      await notesModule.service.deleteItem(noteId);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof NoteApplicationError
      ? error.message
      : "Não foi possível eliminar o documento.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

async function saveGoogleNote(
  user: NonNullable<Awaited<ReturnType<typeof getAuthenticatedUser>>>,
  noteId: string,
  values: { body?: unknown; expectedGoogleRevisionId?: unknown; expectedVersion?: unknown; folderId?: unknown; title?: unknown },
) {
  if (!canManageGoogle(user.role)) throw new NoteApplicationError("Só Admin pode editar Google Notes.");
  if (typeof values.expectedGoogleRevisionId !== "string") throw new NoteApplicationError("Revisão Google inválida.");
  return (await createGoogleNotesModule()).googleService.save({
    body: String(values.body), expectedGoogleRevisionId: values.expectedGoogleRevisionId,
    expectedVersion: Number(values.expectedVersion), folderId: typeof values.folderId === "string" ? values.folderId : null,
    memberId: user.id,
    noteId, title: String(values.title),
  });
}
