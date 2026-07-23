import { DEFAULT_THEME_PREFERENCE, THEME_STORAGE_KEY } from "./theme";

export const themeInitScript = `
(function () {
  var storageKey = ${JSON.stringify(THEME_STORAGE_KEY)};
  var fallbackPreference = ${JSON.stringify(DEFAULT_THEME_PREFERENCE)};
  var root = document.documentElement;

  function normalize(value) {
    return value === "dark" || value === "light" || value === "system"
      ? value
      : fallbackPreference;
  }

  function getSystemTheme() {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
  }

  try {
    var preference = normalize(window.localStorage.getItem(storageKey));
    var resolvedTheme = preference === "system" ? getSystemTheme() : preference;

    root.dataset.theme = resolvedTheme;
    root.dataset.themePreference = preference;
    root.style.colorScheme = resolvedTheme;
  } catch (error) {
    root.dataset.theme = fallbackPreference;
    root.dataset.themePreference = fallbackPreference;
    root.style.colorScheme = fallbackPreference;
  }
})();
`;
