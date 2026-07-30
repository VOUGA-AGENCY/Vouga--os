import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { SupabaseMeetingContextDirectory } from "./supabase-meeting-context-directory";

describe("SupabaseMeetingContextDirectory", () => {
  it("reads the many-to-one Organisation embedded in a Contact", async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        {
          id: "contact-1",
          display_name: "Ana",
          company: { name: "Acme" },
        },
      ],
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    const directory = new SupabaseMeetingContextDirectory({
      from,
    } as unknown as SupabaseClient);

    await expect(directory.listContacts()).resolves.toEqual([
      {
        id: "contact-1",
        displayName: "Ana",
        companyName: "Acme",
      },
    ]);
  });
});
