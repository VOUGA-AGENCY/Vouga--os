"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { GOVERNANCE_COOKIE_NAME } from "@/foundation/security/governance-session";
import { createClient } from "@/persistence/supabase/server";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  (await cookies()).delete(GOVERNANCE_COOKIE_NAME);
  redirect("/login");
}
