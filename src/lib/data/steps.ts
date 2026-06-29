import { supabase } from "@/integrations/supabase/client";
import type { Step } from "./types";

// Adapter Supabase para o domínio "steps" (próximos passos).
// O cast para any é intencional: isola esta camada dos tipos gerados pelo
// Lovable, para o resto da app não depender da estrutura antiga.
const sb = supabase as unknown as {
  from: (t: string) => any;
};

export const steps = {
  async list(): Promise<Step[]> {
    const { data, error } = await sb
      .from("steps")
      .select("*")
      .order("done", { ascending: true })
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []) as Step[];
  },

  async create(title: string): Promise<void> {
    const { error } = await sb.from("steps").insert({ title });
    if (error) throw error;
  },

  async update(
    id: string,
    patch: Partial<Pick<Step, "title" | "done" | "notes" | "position">>,
  ): Promise<void> {
    const { error } = await sb
      .from("steps")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  },

  async remove(id: string): Promise<void> {
    const { error } = await sb.from("steps").delete().eq("id", id);
    if (error) throw error;
  },
};
