import { sb } from "./sb";
import type { Cost } from "./types";

export const finance = {
  async listCosts(): Promise<Cost[]> {
    const { data, error } = await sb
      .from("costs")
      .select("id,area,amount_cents,period,description,occurred_on")
      .order("occurred_on", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Cost[];
  },
  async createCost(input: { area: string; amount_cents: number; period: string; description?: string | null }): Promise<void> {
    const { error } = await sb.from("costs").insert({
      area: input.area,
      amount_cents: input.amount_cents,
      period: input.period,
      description: input.description ?? null,
    });
    if (error) throw error;
  },
  async removeCost(id: string): Promise<void> {
    const { error } = await sb.from("costs").delete().eq("id", id);
    if (error) throw error;
  },
};
