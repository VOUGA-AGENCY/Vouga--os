import { redirect } from "next/navigation";

import { getAuthenticatedUser } from "@/application/auth/current-user";
import { createGlobalSearchIndex } from "@/foundation/composition/global-search";
import { getSupabasePublicEnv } from "@/foundation/config/supabase-env";
import { AppShell } from "@/foundation/navigation/app-shell";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  if (!getSupabasePublicEnv()) redirect("/login");

  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");

  const search = await createGlobalSearchIndex(new Date().toISOString()).catch(() => ({
    items: [],
    isPartial: true,
  }));

  return (
    <AppShell
      memberLabel={user.email ?? "Sessão Vouga"}
      searchIsPartial={search.isPartial}
      searchItems={search.items}
    >
      {children}
    </AppShell>
  );
}
