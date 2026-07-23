import "server-only";

import { DecisionService } from "@/application/decisions/decision-service";
import { SupabaseDecisionContextDirectory } from "@/persistence/decisions/supabase-decision-context-directory";
import { SupabaseDecisionReadModel } from "@/persistence/decisions/supabase-decision-read-model";
import { SupabaseDecisionRepository } from "@/persistence/decisions/supabase-decision-repository";
import { SupabaseMemberDirectory } from "@/persistence/members/supabase-member-directory";
import { createClient } from "@/persistence/supabase/server";

export async function createDecisionModule() {
  const supabase = await createClient();
  const repository = new SupabaseDecisionRepository(supabase);
  return {
    service: new DecisionService(
      repository,
      new SupabaseMemberDirectory(supabase),
      new SupabaseDecisionContextDirectory(supabase),
    ),
    readModel: new SupabaseDecisionReadModel(supabase),
  };
}
