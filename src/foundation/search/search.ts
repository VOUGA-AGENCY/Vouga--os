import type { GlobalSearchItem } from "@/projections/search/global-search";

export function normalizeSearchValue(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-PT")
    .trim();
}

export function filterSearchItems(
  items: readonly GlobalSearchItem[],
  query: string,
  limit = 12,
): GlobalSearchItem[] {
  const normalized = normalizeSearchValue(query);
  if (!normalized) return items.slice(0, limit);

  const terms = normalized.split(/\s+/);
  return items
    .filter((item) => {
      const haystack = normalizeSearchValue([item.title, item.type, ...item.keywords].join(" "));
      return terms.every((term) => haystack.includes(term));
    })
    .slice(0, limit);
}
