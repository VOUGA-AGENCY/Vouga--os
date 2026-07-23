import "server-only";
import { RelationsService } from "@/application/relations/relations-service";
import {
  SupabaseContactRepository,
  SupabaseRelationsDirectory,
  SupabaseRelationsReadModel,
} from "@/persistence/relations/supabase-relations";
import { createClient } from "@/persistence/supabase/server";
export async function createRelationsModule() {
  const supabase = await createClient();
  return {
    service: new RelationsService(
      new SupabaseContactRepository(supabase),
      new SupabaseRelationsDirectory(supabase),
    ),
    readModel: new SupabaseRelationsReadModel(supabase),
  };
}
