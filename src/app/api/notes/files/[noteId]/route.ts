import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/application/auth/current-user";
import { createNotesModule } from "@/foundation/composition/notes";

export async function GET(_request: Request, context: { params: Promise<{ noteId: string }> }) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const { noteId } = await context.params;
  const { files, repository } = await createNotesModule();
  const note = await repository.findItem(noteId);
  if (!note || note.kind !== "upload" || !note.storagePath || !note.mimeType) {
    return NextResponse.json({ error: "Ficheiro não encontrado." }, { status: 404 });
  }
  try {
    const blob = await files.download(note.storagePath);
    return new NextResponse(blob, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(note.originalFileName ?? note.title)}`,
        "Content-Type": note.mimeType,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Não foi possível abrir o ficheiro." }, { status: 404 });
  }
}
