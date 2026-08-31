import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/application/auth/current-user";
import { NoteApplicationError } from "@/application/notes/note-service";
import { createNotesModule } from "@/foundation/composition/notes";

export async function PATCH(request: Request, context: { params: Promise<{ folderId: string }> }) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const { folderId } = await context.params;
  const values = (await request.json().catch(() => null)) as { name?: unknown } | null;
  if (typeof values?.name !== "string") {
    return NextResponse.json({ error: "Nome de pasta inválido." }, { status: 400 });
  }
  try {
    await (await createNotesModule()).service.renameFolder(folderId, values.name);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof NoteApplicationError
      ? error.message
      : "Não foi possível renomear a pasta.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ folderId: string }> }) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Só Admin pode eliminar pastas." }, { status: 403 });
  }
  const { folderId } = await context.params;
  try {
    await (await createNotesModule()).service.deleteFolder(folderId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof NoteApplicationError
      ? error.message
      : "Não foi possível eliminar a pasta.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
