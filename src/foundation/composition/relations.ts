import "server-only";
import { cache } from "react";
import { RelationsService } from "@/application/relations/relations-service";
import {
  SupabaseContactRepository,
  SupabaseRelationsDirectory,
  SupabaseRelationsReadModel,
} from "@/persistence/relations/supabase-relations";
import { createClient } from "@/persistence/supabase/server";
export const createRelationsModule = cache(async () => {
  const supabase = await createClient();
  return {
    service: new RelationsService(
      new SupabaseContactRepository(supabase),
      new SupabaseRelationsDirectory(supabase),
    ),
    readModel: new SupabaseRelationsReadModel(supabase),
  };
});
