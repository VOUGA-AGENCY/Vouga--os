import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("single light appearance", () => {
  test("keeps the shell light and the workspace background outside navigation", () => {
    const layout = source("src/app/layout.tsx");
    const settings = source("src/app/(workspace)/settings/page.tsx");
    const tokens = source("src/foundation/design-tokens.css");
    const css = source("src/app/globals.css");

    expect(layout).toContain('data-theme="light"');
    expect(layout).not.toContain("themeInitScript");
    expect(settings).not.toContain("ThemeSwitcher");
    expect(tokens).toContain("color-scheme: light");
    expect(tokens).not.toContain('[data-theme="dark"]');
    expect(css).toMatch(/\.workspace-content\s*\{[^}]*background-image:[^}]*var\(--color-bg\) 75%[^}]*url\("\/backgorund\.png"\)/);
    expect(css).not.toMatch(/\.app-sidebar\s*\{[^}]*background-image/);
    expect(css).not.toMatch(/\.workspace-header\s*\{[^}]*background-image/);
  });
});
