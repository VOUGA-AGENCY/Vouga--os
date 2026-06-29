import { sb } from "./sb";
import type { Milestone } from "./types";

export const milestones = {
  async list(): Promise<Milestone[]> {
    const { data, error } = await sb
      .from("roadmap_items")
      .select("id,title,target_date,status,description")
      .eq("kind", "milestone")
      .order("target_date", { ascending: true });
    if (error) throw error;
    return (data ?? []) as Milestone[];
  },
  async create(input: { title: string; target_date: string | null; description?: string | null }): Promise<void> {
    const { error } = await sb.from("roadmap_items").insert({
      title: input.title,
      target_date: input.target_date,
      description: input.description ?? null,
      kind: "milestone",
    });
    if (error) throw error;
  },
  async update(id: string, patch: Partial<Pick<Milestone, "title" | "target_date" | "status" | "description">>): Promise<void> {
    const { error } = await sb.from("roadmap_items").update(patch).eq("id", id);
    if (error) throw error;
  },
  async remove(id: string): Promise<void> {
    const { error } = await sb.from("roadmap_items").delete().eq("id", id);
    if (error) throw error;
  },
};
