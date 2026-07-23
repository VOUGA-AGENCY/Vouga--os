"use client";

import { Check, Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { useEffect, useId, useState } from "react";

import {
  DEFAULT_THEME_PREFERENCE,
  THEME_STORAGE_KEY,
  normalizeThemePreference,
  resolveThemePreference,
  themeOptions,
  type ResolvedTheme,
  type ThemePreference,
} from "./theme";

const colorSchemeQuery = "(prefers-color-scheme: light)";

const themeIcons: Record<ThemePreference, LucideIcon> = {
  dark: Moon,
  light: Sun,
  system: Monitor,
};

export function ThemeSwitcher() {
  const groupName = useId();
  const [preference, setPreference] = useState<ThemePreference>(getInitialThemePreference);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(getInitialResolvedTheme);

  useEffect(() => {
    const media = window.matchMedia(colorSchemeQuery);

    function handleSystemThemeChange() {
      const nextPreference = readStoredThemePreference();

      setPreference(nextPreference);
      setResolvedTheme(applyThemePreference(nextPreference));
    }

    function handleStorageChange(event: StorageEvent) {
      if (event.key !== THEME_STORAGE_KEY) return;

      const nextPreference = normalizeThemePreference(event.newValue);

      setPreference(nextPreference);
      setResolvedTheme(applyThemePreference(nextPreference));
    }

    media.addEventListener("change", handleSystemThemeChange);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      media.removeEventListener("change", handleSystemThemeChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  function selectPreference(nextPreference: ThemePreference) {
    writeStoredThemePreference(nextPreference);
    setPreference(nextPreference);
    setResolvedTheme(applyThemePreference(nextPreference));
  }

  const currentLabel =
    preference === "system"
      ? `System / ${resolvedTheme === "light" ? "Light" : "Dark"}`
      : labelFor(preference);

  return (
    <fieldset className="theme-switcher">
      <legend>
        <span className="eyebrow">Appearance</span>
        <span>{currentLabel}</span>
      </legend>
      <div className="theme-options">
        {themeOptions.map((option) => {
          const Icon = themeIcons[option.value];
          const active = preference === option.value;

          return (
            <label
              className={`theme-option ${active ? "theme-option-active" : ""}`}
              key={option.value}
              title={option.description}
            >
              <input
                checked={active}
                name={groupName}
                onChange={() => selectPreference(option.value)}
                type="radio"
                value={option.value}
              />
              <Icon aria-hidden="true" />
              <span>{option.label}</span>
              <span aria-hidden="true" className="theme-option-indicator">
                <Check />
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function readStoredThemePreference(): ThemePreference {
  try {
    return normalizeThemePreference(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return DEFAULT_THEME_PREFERENCE;
  }
}

function getInitialThemePreference(): ThemePreference {
  if (typeof window === "undefined") return DEFAULT_THEME_PREFERENCE;

  return readStoredThemePreference();
}

function getInitialResolvedTheme(): ResolvedTheme {
  if (typeof document === "undefined") return "dark";

  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function writeStoredThemePreference(preference: ThemePreference) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Local persistence is best-effort until user preferences exist server-side.
  }
}

function applyThemePreference(preference: ThemePreference): ResolvedTheme {
  const resolvedTheme = resolveThemePreference(preference, getSystemTheme());
  const root = document.documentElement;

  root.dataset.theme = resolvedTheme;
  root.dataset.themePreference = preference;
  root.style.colorScheme = resolvedTheme;

  return resolvedTheme;
}

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia(colorSchemeQuery).matches ? "light" : "dark";
}

function labelFor(preference: ThemePreference) {
  return themeOptions.find((option) => option.value === preference)?.label ?? "Dark";
}
