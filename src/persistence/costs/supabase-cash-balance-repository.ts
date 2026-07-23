import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CashBalanceRepository, CashBalanceSnapshot } from "@/application/costs/contracts";

export class SupabaseCashBalanceRepository implements CashBalanceRepository {
  constructor(private readonly supabase: SupabaseClient) {}
  async create(values: {
    balanceMinor: number;
    currency: string;
    confirmedAt: string;
    confirmedByMemberId: string;
    description?: string | null;
  }): Promise<CashBalanceSnapshot> {
    const { data, error } = await this.supabase.rpc("create_cash_balance_snapshot", {
      p_balance_minor: values.balanceMinor,
      p_currency: values.currency,
      p_confirmed_at: values.confirmedAt,
      p_confirmed_by_member_id: values.confirmedByMemberId,
      p_description: values.description ?? null,
    });
    if (error || typeof data !== "string") throw new Error("Não foi possível confirmar o saldo.");
    const { data: row, error: rowError } = await this.supabase
      .from("cash_balance_snapshots")
      .select(
        "id,balance_minor,currency,confirmed_at,confirmed_by_member_id,description,created_at,member:members!cash_balance_snapshots_confirmed_by_member_id_fkey(display_name)",
      )
      .eq("id", data)
      .single();
    if (rowError || !row) throw new Error("Não foi possível carregar o saldo confirmado.");
    const member = row.member as unknown as { display_name: string } | null;
    return {
      id: row.id,
      balanceMinor: Number(row.balance_minor),
      currency: row.currency,
      confirmedAt: row.confirmed_at,
      confirmedByMemberId: row.confirmed_by_member_id,
      confirmedByDisplayName: member?.display_name ?? "Membro",
      description: row.description,
      createdAt: row.created_at,
    };
  }
}
