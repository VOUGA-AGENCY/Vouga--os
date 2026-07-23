import "server-only";
import { SprintService } from "@/application/sprints/sprint-service";
import { SupabaseMemberDirectory } from "@/persistence/members/supabase-member-directory";
import { SupabaseSprintReadModel } from "@/persistence/sprints/supabase-sprint-read-model";
import { SupabaseSprintRepository } from "@/persistence/sprints/supabase-sprint-repository";
import { SupabaseSprintTaskDirectory } from "@/persistence/sprints/supabase-sprint-task-directory";
import { createClient } from "@/persistence/supabase/server";
export async function createSprintModule() { const supabase = await createClient(); const repository = new SupabaseSprintRepository(supabase); return { service: new SprintService(repository, new SupabaseMemberDirectory(supabase), new SupabaseSprintTaskDirectory(supabase)), readModel: new SupabaseSprintReadModel(supabase) }; }
