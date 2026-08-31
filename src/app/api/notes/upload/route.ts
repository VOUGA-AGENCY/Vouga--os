import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/application/auth/current-user";
import { getNoteErrorMessage } from "@/application/notes/note-service";
import { createNotesModule } from "@/foundation/composition/notes";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Escolhe um ficheiro." }, { status: 400 });
    const folderValue = formData.get("folder_id");
    const id = await (await createNotesModule()).service.importFile({
      file,
      folderId: typeof folderValue === "string" ? folderValue : null,
      memberId: user.id,
    });
    return NextResponse.json({ id });
  } catch (error) {
    return NextResponse.json({ error: getNoteErrorMessage(error) }, { status: 400 });
  }
}
