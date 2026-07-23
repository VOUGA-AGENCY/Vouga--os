const WORKSPACE_RETURN_PREFIXES = [
  "/advanced",
  "/calendar",
  "/companies",
  "/costs",
  "/decisions",
  "/governance",
  "/meetings",
  "/notes",
  "/relations",
  "/roadmap",
  "/settings",
  "/sprints",
  "/tasks",
  "/vault",
  "/work",
] as const;

export function withReturnTo(href: string, returnTo: string): string {
  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}returnTo=${encodeURIComponent(returnTo)}`;
}

export function safeWorkspaceReturnTo(value: string | undefined, fallback: string): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  const pathname = value.split("?")[0] ?? "";
  return WORKSPACE_RETURN_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
    ? value
    : fallback;
}

export function returnLabel(returnTo: string, fallbackLabel: string): string {
  const pathname = returnTo.split("?")[0] ?? returnTo;
  if (pathname === "/calendar" || pathname.startsWith("/calendar/")) return "Calendar";
  return fallbackLabel;
}
