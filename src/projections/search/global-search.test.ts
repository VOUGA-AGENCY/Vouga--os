import { describe, expect, it } from "vitest";

import { composeGlobalSearch } from "./global-search";

type SearchSources = Parameters<typeof composeGlobalSearch>[0];

function emptySources(): SearchSources {
  return {
    companies: { list: async () => [] },
    relations: { listContacts: async () => [] },
    decisions: { list: async () => [] },
    meetings: { list: async () => [] },
    roadmap: {
      getGlobal: async () => ({ now: [], next: [], later: [] }),
      listHistory: async () => [],
    },
    sprints: { list: async () => [] },
    tasks: { list: async () => [] },
  } as unknown as SearchSources;
}

describe("composeGlobalSearch", () => {
  it("reports a complete empty index when all sources answer", async () => {
    const result = await composeGlobalSearch(emptySources(), "2026-07-19T12:00:00.000Z");

    expect(result).toEqual({ items: [], isPartial: false });
  });

  it("preserves available objects and reports a partial index", async () => {
    const sources = emptySources();
    const result = await composeGlobalSearch(
      {
        ...sources,
        companies: { list: async () => { throw new Error("unavailable"); } },
        tasks: {
          list: async () => [{
            id: "task-1",
            title: "Fechar proposta",
            expectedResult: "Proposta pronta",
            status: "todo",
            ownerDisplayName: "Miguel",
            companyNames: ["Alder"],
          }],
        },
      } as unknown as SearchSources,
      "2026-07-19T12:00:00.000Z",
    );

    expect(result.isPartial).toBe(true);
    expect(result.items).toEqual([
      expect.objectContaining({ id: "task-1", title: "Fechar proposta", type: "task" }),
    ]);
  });
});
