import "server-only";

import { cache } from "react";

import { ProjectService } from "@/application/projects/project-service";
import { SupabaseMemberDirectory } from "@/persistence/members/supabase-member-directory";
import { SupabaseProjectContextDirectory } from "@/persistence/projects/supabase-project-context-directory";
import { SupabaseProjectReadModel } from "@/persistence/projects/supabase-project-read-model";
import { SupabaseProjectRepository } from "@/persistence/projects/supabase-project-repository";
import { createClient } from "@/persistence/supabase/server";

export const createProjectModule = cache(async () => {
  const supabase = await createClient();
  return {
    service: new ProjectService(
      new SupabaseProjectRepository(supabase),
      new SupabaseMemberDirectory(supabase),
      new SupabaseProjectContextDirectory(supabase),
    ),
    readModel: new SupabaseProjectReadModel(supabase),
  };
});
