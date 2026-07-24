import { describe, expect, it } from "vitest";

import {
  DEFAULT_THEME_PREFERENCE,
  isThemePreference,
  normalizeThemePreference,
  resolveThemePreference,
  THEME_STORAGE_KEY,
  themeOptions,
} from "./theme";
import { themeInitScript } from "./theme-init-script";

describe("theme preferences", () => {
  it("keeps the official appearance options stable", () => {
    expect(themeOptions.map((option) => option.value)).toEqual(["dark", "light", "system"]);
  });

  it("accepts only supported theme preferences", () => {
    expect(isThemePreference("dark")).toBe(true);
    expect(isThemePreference("light")).toBe(true);
    expect(isThemePreference("system")).toBe(true);
    expect(isThemePreference("sepia")).toBe(false);
  });

  it("falls back to the default product theme for invalid storage values", () => {
    expect(normalizeThemePreference(null)).toBe(DEFAULT_THEME_PREFERENCE);
    expect(normalizeThemePreference("")).toBe(DEFAULT_THEME_PREFERENCE);
    expect(normalizeThemePreference("sepia")).toBe(DEFAULT_THEME_PREFERENCE);
  });

  it("resolves system preference without creating a third visual theme", () => {
    expect(resolveThemePreference("system", "light")).toBe("light");
    expect(resolveThemePreference("system", "dark")).toBe("dark");
    expect(resolveThemePreference("dark", "light")).toBe("dark");
  });

  it("restores a persisted light preference before hydration", () => {
    expect(runThemeInitScript({ storedValue: "light" })).toEqual({
      preference: "light",
      theme: "light",
      colorScheme: "light",
    });
  });

  it("respects the system color scheme when system is persisted", () => {
    expect(runThemeInitScript({ storedValue: "system", systemLight: true })).toEqual({
      preference: "system",
      theme: "light",
      colorScheme: "light",
    });
  });

  it("falls back safely when local storage is unavailable during boot", () => {
    expect(runThemeInitScript({ storageThrows: true })).toEqual({
      preference: DEFAULT_THEME_PREFERENCE,
      theme: DEFAULT_THEME_PREFERENCE,
      colorScheme: DEFAULT_THEME_PREFERENCE,
    });
  });
});

function runThemeInitScript({
  storageThrows = false,
  storedValue,
  systemLight = false,
}: {
  storageThrows?: boolean;
  storedValue?: string | null;
  systemLight?: boolean;
}) {
  const root = { dataset: {} as Record<string, string>, style: {} as Record<string, string> };
  const document = { documentElement: root };
  const window = {
    localStorage: {
      getItem(key: string) {
        if (storageThrows) throw new Error("localStorage unavailable");
        if (key !== THEME_STORAGE_KEY) return null;

        return storedValue ?? null;
      },
    },
    matchMedia() {
      return { matches: systemLight };
    },
  };

  Function("document", "window", themeInitScript)(document, window);

  return {
    preference: root.dataset.themePreference,
    theme: root.dataset.theme,
    colorScheme: root.style.colorScheme,
  };
}
