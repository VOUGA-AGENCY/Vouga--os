export const THEME_STORAGE_KEY = "vouga-os.theme-preference";

export const themePreferences = ["dark", "light", "system"] as const;

export type ThemePreference = (typeof themePreferences)[number];
export type ResolvedTheme = Exclude<ThemePreference, "system">;

export const DEFAULT_THEME_PREFERENCE: ThemePreference = "dark";

export const themeOptions: ReadonlyArray<{
  value: ThemePreference;
  label: string;
  description: string;
}> = [
  { value: "dark", label: "Dark", description: "Tema principal do Vouga OS" },
  { value: "light", label: "Light", description: "Tema claro editorial" },
  { value: "system", label: "System", description: "Segue o sistema operativo" },
];

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === "string" && themePreferences.includes(value as ThemePreference);
}

export function normalizeThemePreference(value: unknown): ThemePreference {
  return isThemePreference(value) ? value : DEFAULT_THEME_PREFERENCE;
}

export function resolveThemePreference(
  preference: ThemePreference,
  systemTheme: ResolvedTheme,
): ResolvedTheme {
  return preference === "system" ? systemTheme : preference;
}
