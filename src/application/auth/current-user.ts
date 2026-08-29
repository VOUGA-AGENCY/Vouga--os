import "server-only";

import { cache } from "react";
import { createClient } from "@/persistence/supabase/server";

export type UserRole = "admin" | "engineer";

export type AuthenticatedUser = {
  id: string;
  email: string | null;
  role: UserRole;
  isActive: boolean;
};

export const getAuthenticatedUser = cache(async (): Promise<AuthenticatedUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) return null;

  const userId = data.claims.sub;
  const { data: member } = await supabase
    .from("members")
    .select("role, is_active")
    .eq("id", userId)
    .maybeSingle();

  const role = (member?.role === "admin" ? "admin" : "engineer") as UserRole;
  const isActive = member ? Boolean(member.is_active) : true;

  if (!isActive) return null;

  return {
    id: userId,
    email: typeof data.claims.email === "string" ? data.claims.email : null,
    role,
    isActive
  };
});
