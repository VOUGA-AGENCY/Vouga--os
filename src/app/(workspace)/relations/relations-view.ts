export const RELATIONS_VIEWS = ["contacts", "profiles", "organizations", "scripts"] as const;
export const RELATIONS_LAYOUTS = ["list", "grid"] as const;
export const RELATIONS_SORTS = ["name_asc", "name_desc", "owner", "recent"] as const;

export type RelationsView = (typeof RELATIONS_VIEWS)[number];
export type RelationsLayout = (typeof RELATIONS_LAYOUTS)[number];
export type RelationsSort = (typeof RELATIONS_SORTS)[number];
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

export function resolveRelationsSort(value?: string): RelationsSort {
  if (value === "name_desc" || value === "owner" || value === "recent") return value;
  return "name_asc";
}

export function relationsHref({
  layout,
  segment,
  sort,
  view,
}: {
  layout: RelationsLayout;
  segment: RelationsSegment;
  sort?: RelationsSort;
  view: RelationsView;
}): string {
  const params = new URLSearchParams();
  if (view !== "contacts") params.set("view", view);
  if (segment) params.set("segment", segment);
  params.set("layout", layout);
  if (sort && sort !== "name_asc") params.set("sort", sort);
  return `/relations?${params.toString()}`;
}

export function sortRelationItems<
  T extends Readonly<{
    name: string;
    ownerName: string;
    recentAt: string | null;
  }>,
>(items: readonly T[], sort: RelationsSort): T[] {
  const collator = new Intl.Collator("pt-PT", { sensitivity: "base" });
  return [...items].sort((left, right) => {
    if (sort === "recent") {
      return (right.recentAt ?? "").localeCompare(left.recentAt ?? "");
    }
    if (sort === "owner") {
      return (
        collator.compare(left.ownerName, right.ownerName) || collator.compare(left.name, right.name)
      );
    }
    return sort === "name_desc"
      ? collator.compare(right.name, left.name)
      : collator.compare(left.name, right.name);
  });
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
