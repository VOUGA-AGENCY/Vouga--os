import "server-only";

import { MeetingService } from "@/application/meetings/meeting-service";
import { SupabaseMeetingContextDirectory } from "@/persistence/meetings/supabase-meeting-context-directory";
import { SupabaseMeetingReadModel } from "@/persistence/meetings/supabase-meeting-read-model";
import { SupabaseMeetingRepository } from "@/persistence/meetings/supabase-meeting-repository";
import { SupabaseMemberDirectory } from "@/persistence/members/supabase-member-directory";
import { createClient } from "@/persistence/supabase/server";

export async function createMeetingModule() {
  const supabase = await createClient();
  return {
    service: new MeetingService(
      new SupabaseMeetingRepository(supabase),
      new SupabaseMemberDirectory(supabase),
      new SupabaseMeetingContextDirectory(supabase),
    ),
    readModel: new SupabaseMeetingReadModel(supabase),
  };
}
