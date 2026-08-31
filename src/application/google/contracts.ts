import type { GoogleConnection } from "@/domain/google/google-connection";

export type ProtectedGoogleToken = Readonly<{
  ciphertext: string;
  iv: string;
  keyVersion: number;
}>;

export type StoredGoogleConnection = Readonly<{
  connection: GoogleConnection;
  refreshToken: ProtectedGoogleToken;
}>;

export type GoogleAuthorizationTokens = Readonly<{
  accessToken: string;
  refreshToken: string | null;
  scopes: readonly string[];
}>;

export type GoogleIdentity = Readonly<{
  subject: string;
  email: string;
  emailVerified: boolean;
}>;

export type GoogleCalendarOption = Readonly<{
  id: string;
  name: string;
  accessRole: "reader" | "writer" | "owner";
  primary: boolean;
}>;

export type GoogleCalendarSelection = Readonly<{
  calendarId: string;
  publishesOsEvents: boolean;
}>;

export type GoogleCalendarEvent = Readonly<{
  allDay: boolean;
  calendarId: string;
  description: string | null;
  end: string;
  eventType: string | null;
  htmlLink: string;
  id: string;
  location: string | null;
  start: string;
  status: "confirmed" | "tentative";
  title: string;
  transparency: string | null;
}>;

export type GoogleCalendarEventInput = Readonly<{
  allDay: boolean;
  colorId: string | null;
  description: string;
  end: string;
  meetingId: string;
  meetingKind: "meeting" | "event" | "vacation";
  start: string;
  title: string;
}>;

export type GoogleDriveDocument = Readonly<{
  id: string;
  title: string;
  htmlLink: string;
  modifiedAt: string | null;
  createdAt: string | null;
}>;

export type GoogleDocumentContent = Readonly<{
  documentId: string;
  title: string;
  text: string;
  revisionId: string;
  endIndex: number;
}>;

export type GoogleMeetingMirror = Readonly<{
  calendarId: string;
  googleEventId: string;
  meetingId: string;
  memberId: string;
  syncStatus: "pending" | "synced" | "error" | "deleted";
}>;

export interface GoogleConnectionRepository {
  findActiveByMemberId(memberId: string): Promise<StoredGoogleConnection | null>;
  save(connection: GoogleConnection, refreshToken: ProtectedGoogleToken): Promise<void>;
  revoke(memberId: string, revokedAt: string): Promise<void>;
}

export interface GoogleOAuthGateway {
  createAuthorizationUrl(values: { state: string; loginHint?: string | null }): string;
  createPickerAuthorizationUrl(values: { state: string; loginHint?: string | null }): string;
  exchangeAuthorizationCode(code: string): Promise<GoogleAuthorizationTokens>;
  getIdentity(accessToken: string): Promise<GoogleIdentity>;
  refreshAccessToken(refreshToken: string): Promise<string>;
  revokeToken(refreshToken: string): Promise<void>;
}

export interface GoogleCalendarGateway {
  listCalendars(accessToken: string): Promise<GoogleCalendarOption[]>;
  listEvents(
    accessToken: string,
    calendarId: string,
    range: Readonly<{ start: string; end: string }>,
  ): Promise<GoogleCalendarEvent[]>;
  upsertEvent(
    accessToken: string,
    calendarId: string,
    eventId: string,
    event: GoogleCalendarEventInput,
  ): Promise<void>;
  deleteEvent(accessToken: string, calendarId: string, eventId: string): Promise<void>;
  getEvent(
    accessToken: string,
    calendarId: string,
    eventId: string,
  ): Promise<GoogleCalendarEvent | null>;
}

export interface GoogleDriveDocumentGateway {
  createDocument(accessToken: string, title: string): Promise<GoogleDriveDocument>;
  listDocuments(accessToken: string, query: string | null): Promise<GoogleDriveDocument[]>;
  getDocument(accessToken: string, documentId: string): Promise<GoogleDriveDocument>;
  getDocumentContent(accessToken: string, documentId: string): Promise<GoogleDocumentContent>;
  trashDocument(accessToken: string, documentId: string): Promise<void>;
  replaceDocumentContent(
    accessToken: string,
    values: Readonly<{
      documentId: string;
      title: string;
      text: string;
      requiredRevisionId: string;
      endIndex: number;
    }>,
  ): Promise<GoogleDocumentContent>;
}

export interface GoogleCalendarSelectionRepository {
  list(memberId: string): Promise<GoogleCalendarSelection[]>;
  replace(
    memberId: string,
    calendarIds: readonly string[],
    publishCalendarId: string | null,
  ): Promise<void>;
}

export interface GoogleMeetingMirrorRepository {
  find(memberId: string, meetingId: string): Promise<GoogleMeetingMirror | null>;
  save(mirror: GoogleMeetingMirror, lastSyncedAt: string | null): Promise<void>;
}

export interface GoogleEventArtifactRepository {
  find(
    memberId: string,
    calendarId: string,
    eventId: string,
  ): Promise<import("@/domain/google/google-event-artifact").GoogleEventArtifact | null>;
  list(
    memberId: string,
  ): Promise<import("@/domain/google/google-event-artifact").GoogleEventArtifact[]>;
  listShared(): Promise<import("@/domain/google/google-event-artifact").GoogleEventArtifact[]>;
  save(
    artifact: import("@/domain/google/google-event-artifact").GoogleEventArtifact,
  ): Promise<void>;
  hasTaskOrigins(memberId: string, calendarId: string, eventId: string): Promise<boolean>;
  delete(memberId: string, calendarId: string, eventId: string): Promise<void>;
}

export interface GoogleTokenProtector {
  protect(token: string): Promise<ProtectedGoogleToken>;
  reveal(token: ProtectedGoogleToken): Promise<string>;
}
