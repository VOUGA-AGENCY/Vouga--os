import { describe, expect, it } from "vitest";

import {
  profilesForInteractionCompany,
  relationsHref,
  resolveRelationsLayout,
  resolveRelationsSegment,
  resolveRelationsSort,
  resolveRelationsView,
  sortRelationItems,
} from "./relations-view";

describe("Contacts presentation state", () => {
  it("defaults unknown values to Contacts, Follow-ups and list", () => {
    expect(resolveRelationsView("unknown")).toBe("contacts");
    expect(resolveRelationsSegment("internal")).toBeNull();
    expect(resolveRelationsLayout("tiles")).toBe("list");
    expect(resolveRelationsSort("unknown")).toBe("name_asc");
  });

  it("orders directory items without mutating the source", () => {
    const source = [
      { name: "Zeta", ownerName: "Ana", recentAt: "2026-08-01" },
      { name: "Alfa", ownerName: "Miguel", recentAt: "2026-08-29" },
    ] as const;

    expect(sortRelationItems(source, "name_asc").map((item) => item.name)).toEqual([
      "Alfa",
      "Zeta",
    ]);
    expect(sortRelationItems(source, "recent").map((item) => item.name)).toEqual(["Alfa", "Zeta"]);
    expect(source[0].name).toBe("Zeta");
  });

  it("preserves tab, segment and layout in the URL", () => {
    expect(
      relationsHref({
        layout: "grid",
        segment: "prospecting",
        view: "profiles",
      }),
    ).toBe("/relations?view=profiles&segment=prospecting&layout=grid");
  });

  it("keeps the canonical Contacts path while making list explicit", () => {
    expect(relationsHref({ layout: "list", segment: null, view: "contacts" })).toBe(
      "/relations?layout=list",
    );
  });

  it("preserves a CAE filter only for Organizations", () => {
    expect(
      relationsHref({ cae: "62010", layout: "list", segment: null, view: "organizations" }),
    ).toBe("/relations?view=organizations&cae=62010&layout=list");
    expect(relationsHref({ cae: "62010", layout: "list", segment: null, view: "profiles" })).toBe(
      "/relations?view=profiles&layout=list",
    );
  });

  it("offers only Profiles belonging to the selected Organisation", () => {
    const companies = [
      {
        id: "company-a",
        name: "A",
        profiles: [
          { id: "profile-z", name: "Zara" },
          { id: "profile-a", name: "Ana" },
        ],
      },
      {
        id: "company-b",
        name: "B",
        profiles: [{ id: "profile-b", name: "Bruno" }],
      },
    ] as const;

    expect(profilesForInteractionCompany(companies, "company-a")).toEqual([
      { id: "profile-a", name: "Ana" },
      { id: "profile-z", name: "Zara" },
    ]);
    expect(profilesForInteractionCompany(companies, "missing")).toEqual([]);
  });
});
