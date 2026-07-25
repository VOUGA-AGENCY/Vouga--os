import "server-only";

import { cache } from "react";
import { createClient } from "@/persistence/supabase/server";

export type AuthenticatedUser = {
  id: string;
  email: string | null;
};

export const getAuthenticatedUser = cache(async (): Promise<AuthenticatedUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) return null;

  return {
    id: data.claims.sub,
    email: typeof data.claims.email === "string" ? data.claims.email : null
  };
});
