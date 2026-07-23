import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { ActiveMember, MemberDirectory } from "@/application/members/contracts";

type MemberRow = {
  id: string;
  display_name: string;
  email: string;
};

export class SupabaseMemberDirectory implements MemberDirectory {
  constructor(private readonly supabase: SupabaseClient) {}

  async listActive(): Promise<ActiveMember[]> {
    const { data, error } = await this.supabase
      .from("members")
      .select("id,display_name,email")
      .eq("is_active", true)
      .order("display_name");

    if (error) throw new Error("Não foi possível carregar os owners.");

    return (data as MemberRow[]).map((member) => ({
      id: member.id,
      displayName: member.display_name,
      email: member.email,
    }));
  }

  async isActive(id: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("members")
      .select("id")
      .eq("id", id)
      .eq("is_active", true)
      .maybeSingle();

    if (error) throw new Error("Não foi possível validar o owner.");
    return Boolean(data);
  }
}
