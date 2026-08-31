"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/application/auth/current-user";
import { createClient } from "@/persistence/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { requireSupabasePublicEnv } from "@/foundation/config/supabase-env";

export async function changeUserRoleAction(memberId: string, role: "admin" | "engineer") {
  const currentUser = await getAuthenticatedUser();
  if (!currentUser || currentUser.role !== "admin") {
    throw new Error("Access denied: Admin role required");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_member_role", {
    p_member_id: memberId,
    p_role: role,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/governance");
}

export async function toggleUserActiveAction(memberId: string, isActive: boolean) {
  const currentUser = await getAuthenticatedUser();
  if (!currentUser || currentUser.role !== "admin") {
    throw new Error("Access denied: Admin role required");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("toggle_member_active", {
    p_member_id: memberId,
    p_is_active: isActive,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/governance");
}

export async function createUserAction(formData: FormData) {
  const currentUser = await getAuthenticatedUser();
  if (!currentUser || currentUser.role !== "admin") {
    return { error: "Access denied: Admin role required" };
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "engineer") as "admin" | "engineer";

  if (!email || !password) {
    return { error: "Preenche o email e a palavra-passe." };
  }

  try {
    const { url, publishableKey } = requireSupabasePublicEnv();
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

    if (serviceRoleKey) {
      const adminClient = createSupabaseClient(url, serviceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });

      const { error } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          role,
          must_change_password: true,
        },
      });

      if (error) {
        return { error: error.message };
      }
    } else {
      const authClient = createSupabaseClient(url, publishableKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });

      const { error } = await authClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            role,
            must_change_password: true,
          },
        },
      });

      if (error) {
        return { error: error.message };
      }
    }

    revalidatePath("/governance");
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Erro desconhecido ao criar utilizador." };
  }
}
