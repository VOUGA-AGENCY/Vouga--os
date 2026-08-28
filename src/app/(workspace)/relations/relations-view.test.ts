import { describe, expect, it } from "vitest";

import {
  profilesForInteractionCompany,
  relationsHref,
  resolveRelationsLayout,
  resolveRelationsSegment,
  resolveRelationsView,
} from "./relations-view";

describe("Contacts presentation state", () => {
  it("defaults unknown values to Contacts, Follow-ups and list", () => {
    expect(resolveRelationsView("unknown")).toBe("contacts");
    expect(resolveRelationsSegment("internal")).toBeNull();
    expect(resolveRelationsLayout("tiles")).toBe("list");
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
