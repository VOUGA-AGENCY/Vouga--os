import { describe, expect, it } from "vitest";

import type { GlobalSearchItem } from "@/projections/search/global-search";

import { filterSearchItems, normalizeSearchValue } from "./search";

const items: GlobalSearchItem[] = [
  {
    description: "active",
    href: "/companies/1",
    id: "1",
    keywords: ["Relação Porto"],
    title: "Águas do Norte",
    type: "company",
  },
  {
    description: "todo",
    href: "/tasks/2",
    id: "2",
    keywords: ["Proposta comercial"],
    title: "Enviar proposta",
    type: "task",
  },
];

describe("structural search", () => {
  it("normalizes accents and casing", () => {
    expect(normalizeSearchValue("  ÁGUAS  ")).toBe("aguas");
  });

  it("matches title, type and keywords", () => {
    expect(filterSearchItems(items, "aguas").map((item) => item.id)).toEqual(["1"]);
    expect(filterSearchItems(items, "task proposta").map((item) => item.id)).toEqual(["2"]);
  });
});
