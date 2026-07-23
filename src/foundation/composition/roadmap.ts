import "server-only";
import { RoadmapService } from "@/application/roadmap/roadmap-service";
import { SupabaseMemberDirectory } from "@/persistence/members/supabase-member-directory";
import { SupabaseRoadmapContextDirectory } from "@/persistence/roadmap/supabase-roadmap-context-directory";
import { SupabaseRoadmapItemRepository } from "@/persistence/roadmap/supabase-roadmap-item-repository";
import { SupabaseRoadmapReadModel } from "@/persistence/roadmap/supabase-roadmap-read-model";
import { createClient } from "@/persistence/supabase/server";

export async function createRoadmapModule() {
  const supabase = await createClient();
  return {
    service: new RoadmapService(new SupabaseRoadmapItemRepository(supabase), new SupabaseMemberDirectory(supabase), new SupabaseRoadmapContextDirectory(supabase)),
    readModel: new SupabaseRoadmapReadModel(supabase),
  };
}
