export const GOOGLE_IDENTITY_SCOPES = ["openid", "email", "profile"] as const;

export const GOOGLE_DATA_SCOPES = [
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/drive.file",
] as const;
export const GOOGLE_DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file";

export const GOOGLE_OAUTH_SCOPES = [...GOOGLE_IDENTITY_SCOPES, ...GOOGLE_DATA_SCOPES] as const;

export function hasRequiredGoogleDataScopes(scopes: readonly string[]): boolean {
  const granted = new Set(scopes);
  return GOOGLE_DATA_SCOPES.every((scope) => granted.has(scope));
}

export function hasGoogleDriveFileScope(scopes: readonly string[]): boolean {
  return new Set(scopes).has(GOOGLE_DRIVE_FILE_SCOPE);
}
