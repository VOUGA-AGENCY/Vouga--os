import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/application/auth/current-user";
import { getNoteErrorMessage } from "@/application/notes/note-service";
import { createNotesModule } from "@/foundation/composition/notes";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  try {
    const body = await request.json();
    const prepared = await (
      await createNotesModule()
    ).service.prepareFileImport({
      fileName: typeof body.fileName === "string" ? body.fileName : "",
      folderId: typeof body.folderId === "string" ? body.folderId : null,
      memberId: user.id,
      mimeType: typeof body.mimeType === "string" ? body.mimeType : "",
      sizeBytes: typeof body.sizeBytes === "number" ? body.sizeBytes : 0,
    });
    return NextResponse.json(prepared);
  } catch (error) {
    return NextResponse.json({ error: getNoteErrorMessage(error) }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  try {
    const body = await request.json();
    const id = await (
      await createNotesModule()
    ).service.completeFileImport({
      id: typeof body.id === "string" ? body.id : "",
      fileName: typeof body.fileName === "string" ? body.fileName : "",
      folderId: typeof body.folderId === "string" ? body.folderId : null,
      memberId: user.id,
      mimeType: typeof body.mimeType === "string" ? body.mimeType : "",
      path: typeof body.path === "string" ? body.path : "",
      sizeBytes: typeof body.sizeBytes === "number" ? body.sizeBytes : 0,
    });
    return NextResponse.json({ id });
  } catch (error) {
    return NextResponse.json({ error: getNoteErrorMessage(error) }, { status: 400 });
  }
}
