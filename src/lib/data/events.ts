import { supabase } from "@/integrations/supabase/client";
import { sb } from "./sb";
import type { CalEvent } from "./types";

export const events = {
  async listRange(startISO: string, endISO: string): Promise<CalEvent[]> {
    const { data, error } = await sb
      .from("calendar_events")
      .select("id,title,kind,starts_at,ends_at,source_type,source_id")
      .gte("starts_at", startISO)
      .lte("starts_at", endISO)
      .order("starts_at");
    if (error) throw error;
    return (data ?? []) as CalEvent[];
  },
  async create(input: { title: string; starts_at: string; ends_at?: string | null; kind?: string }): Promise<void> {
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await sb.from("calendar_events").insert({
      title: input.title,
      starts_at: input.starts_at,
      ends_at: input.ends_at ?? null,
      kind: input.kind ?? "custom",
      source_type: "custom",
      created_by: userData.user?.id ?? null,
    });
    if (error) throw error;
  },
  async remove(id: string): Promise<void> {
    const { error } = await sb.from("calendar_events").delete().eq("id", id);
    if (error) throw error;
  },
};
