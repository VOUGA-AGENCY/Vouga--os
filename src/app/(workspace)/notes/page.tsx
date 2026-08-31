import { FileText } from "lucide-react";
import { getAuthenticatedUser } from "@/application/auth/current-user";
import { createGoogleConnectionReadModel } from "@/foundation/composition/google";
import { createNotesModule } from "@/foundation/composition/notes";
import { getGoogleOAuthEnv } from "@/foundation/config/google-env";
import { canManageGoogle } from "@/foundation/security/google-access";
import { NotesWorkspace } from "./notes-workspace";

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<{ folder?: string; open?: string }>;
}) {
  const [params, user] = await Promise.all([searchParams, getAuthenticatedUser()]);
  if (!user) return null;
  let workspace = null;
  try {
    workspace = await (await createNotesModule()).service.getWorkspace();
  } catch {
    workspace = null;
  }
  const isAdmin = canManageGoogle(user.role);
  let googleConnected = false;
  if (isAdmin && getGoogleOAuthEnv()) {
    try {
      googleConnected = Boolean(
        await (await createGoogleConnectionReadModel()).findActiveByMemberId(user.id),
      );
    } catch {
      googleConnected = false;
    }
  }

  return (
    <main className="workspace-main module-main notes-main">
      {workspace ? (
        <NotesWorkspace
          folders={workspace.folders}
          googleConnected={googleConnected}
          initialFolderId={params.folder ?? null}
          initialOpenId={params.open ?? null}
          isAdmin={isAdmin}
          items={workspace.items}
        />
      ) : (
        <section className="empty-state empty-state-inline notes-empty">
          <FileText aria-hidden="true" />
          <h2 className="section-title">Notes ainda não está ativa.</h2>
          <p>Aplica a migration partilhada de Notes e volta a abrir esta página.</p>
        </section>
      )}
    </main>
  );
}
