import "server-only";
import { CostService } from "@/application/costs/cost-service";
import { SupabaseCashBalanceRepository } from "@/persistence/costs/supabase-cash-balance-repository";
import { SupabaseCostContextDirectory } from "@/persistence/costs/supabase-cost-context-directory";
import { SupabaseCostReadModel } from "@/persistence/costs/supabase-cost-read-model";
import { SupabaseCostRepository } from "@/persistence/costs/supabase-cost-repository";
import { SupabaseMemberDirectory } from "@/persistence/members/supabase-member-directory";
import { createClient } from "@/persistence/supabase/server";

export async function createCostModule() {
  const supabase = await createClient();
  return {
    service: new CostService(
      new SupabaseCostRepository(supabase),
      new SupabaseCashBalanceRepository(supabase),
      new SupabaseMemberDirectory(supabase),
      new SupabaseCostContextDirectory(supabase),
    ),
    readModel: new SupabaseCostReadModel(supabase),
  };
}
