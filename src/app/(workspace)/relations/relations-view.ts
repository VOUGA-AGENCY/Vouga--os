export const RELATIONS_VIEWS = ["contacts", "profiles", "organizations", "scripts"] as const;
export const RELATIONS_LAYOUTS = ["list", "grid"] as const;

export type RelationsView = (typeof RELATIONS_VIEWS)[number];
export type RelationsLayout = (typeof RELATIONS_LAYOUTS)[number];
export type RelationsSegment = "prospecting" | null;
export type InteractionCompanyOption = Readonly<{
  id: string;
  name: string;
  profiles: readonly Readonly<{ id: string; name: string }>[];
}>;

export function resolveRelationsView(value?: string): RelationsView {
  if (value === "profiles") return "profiles";
  if (value === "organizations") return "organizations";
  if (value === "messages" || value === "scripts") return "scripts";
  return "contacts";
}

export function resolveRelationsSegment(value?: string): RelationsSegment {
  return value === "prospecting" ? value : null;
}

export function resolveRelationsLayout(value?: string): RelationsLayout {
  return value === "grid" ? "grid" : "list";
}

export function relationsHref({
  layout,
  segment,
  view,
}: {
  layout: RelationsLayout;
  segment: RelationsSegment;
  view: RelationsView;
}): string {
  const params = new URLSearchParams();
  if (view !== "contacts") params.set("view", view);
  if (segment) params.set("segment", segment);
  params.set("layout", layout);
  return `/relations?${params.toString()}`;
}

export function profilesForInteractionCompany(
  companies: readonly InteractionCompanyOption[],
  companyId: string,
) {
  return (
    companies
      .find((company) => company.id === companyId)
      ?.profiles.slice()
      .sort((a, b) => a.name.localeCompare(b.name, "pt-PT")) ?? []
  );
}
