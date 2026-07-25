import "server-only";

import { cache } from "react";
import { GoogleCalendarSelectionService } from "@/application/google/google-calendar-selection-service";
import { GoogleCalendarEventService } from "@/application/google/google-calendar-event-service";
import { GoogleConnectionService } from "@/application/google/google-connection-service";
import { GoogleDriveDocumentService } from "@/application/google/google-drive-document-service";
import { GoogleMeetingMirrorService } from "@/application/google/google-meeting-mirror-service";
import { GoogleEventArtifactService } from "@/application/google/google-event-artifact-service";
import { requireGoogleOAuthEnv } from "@/foundation/config/google-env";
import { AesGoogleTokenProtector } from "@/foundation/security/google-token-protector";
import { GoogleCalendarClient } from "@/persistence/google/google-calendar-client";
import { GoogleDriveClient } from "@/persistence/google/google-drive-client";
import { GoogleOAuthClient } from "@/persistence/google/google-oauth-client";
import { SupabaseGoogleCalendarSelectionRepository } from "@/persistence/google/supabase-google-calendar-selection-repository";
import { SupabaseGoogleConnectionReadModel } from "@/persistence/google/supabase-google-connection-read-model";
import { SupabaseGoogleConnectionRepository } from "@/persistence/google/supabase-google-connection-repository";
import { SupabaseGoogleMeetingMirrorRepository } from "@/persistence/google/supabase-google-meeting-mirror-repository";
import { SupabaseGoogleEventArtifactRepository } from "@/persistence/google/supabase-google-event-artifact-repository";
import { SupabaseMemberDirectory } from "@/persistence/members/supabase-member-directory";
import { SupabaseMeetingContextDirectory } from "@/persistence/meetings/supabase-meeting-context-directory";
import { createClient } from "@/persistence/supabase/server";

export async function createGoogleConnectionReadModel() {
  return new SupabaseGoogleConnectionReadModel(await createClient());
}

export const createGoogleIntegrationModule = cache(async () => {
  const env = requireGoogleOAuthEnv();
  const supabase = await createClient();
  const repository = new SupabaseGoogleConnectionRepository(supabase);
  const selectionRepository = new SupabaseGoogleCalendarSelectionRepository(supabase);
  const oauth = new GoogleOAuthClient(env);
  const calendar = new GoogleCalendarClient();
  const drive = new GoogleDriveClient();
  const tokenProtector = new AesGoogleTokenProtector(env.tokenEncryptionKey);
  const mirrorRepository = new SupabaseGoogleMeetingMirrorRepository(supabase);
  const artifactRepository = new SupabaseGoogleEventArtifactRepository(supabase);
  const calendarEventService = new GoogleCalendarEventService(
    repository,
    selectionRepository,
    oauth,
    calendar,
    tokenProtector,
  );

  return {
    artifactRepository,
    calendarEventService,
    eventArtifactService: new GoogleEventArtifactService(
      calendarEventService,
      artifactRepository,
      new SupabaseMemberDirectory(supabase),
      new SupabaseMeetingContextDirectory(supabase),
    ),
    calendarService: new GoogleCalendarSelectionService(
      repository,
      selectionRepository,
      oauth,
      calendar,
      tokenProtector,
    ),
    documentService: new GoogleDriveDocumentService(repository, oauth, drive, tokenProtector),
    meetingMirrorService: new GoogleMeetingMirrorService(
      repository,
      selectionRepository,
      mirrorRepository,
      oauth,
      calendar,
      tokenProtector,
    ),
    env,
    service: new GoogleConnectionService(repository, oauth, tokenProtector),
  };
});
