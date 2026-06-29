import { sb } from "./sb";
import type { Sprint } from "./types";

function fallbackName(s: any): string {
  if (s.name) return s.name;
  const d = new Date(s.starts_on);
  return `Sprint ${d.toLocaleDateString("pt-PT", { day: "2-digit", month: "short" })}`;
}

export const sprints = {
  async list(): Promise<Sprint[]> {
    const { data, error } = await sb.from("sprints").select("*").order("starts_on", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((s: any) => ({ id: s.id, name: fallbackName(s), starts_on: s.starts_on, ends_on: s.ends_on }));
  },
  async create(input: { name: string; starts_on: string; ends_on: string }): Promise<void> {
    const { error } = await sb.from("sprints").insert(input);
    if (error) throw error;
  },
  async update(id: string, patch: Partial<Pick<Sprint, "name" | "starts_on" | "ends_on">>): Promise<void> {
    const { error } = await sb.from("sprints").update(patch).eq("id", id);
    if (error) throw error;
  },
  async remove(id: string): Promise<void> {
    const { error } = await sb.from("sprints").delete().eq("id", id);
    if (error) throw error;
  },
};
