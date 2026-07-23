import { describe, expect, it } from "vitest";

import {
  activateRecurringCost,
  endRecurringCost,
  payOneOffCost,
  validateCostValues,
  type Cost,
} from "./cost";

const base = {
  title: "Supabase",
  description: "Infraestrutura da aplicação.",
  category: "infrastructure" as const,
  expectedAmountMinor: 2500,
  currency: "eur",
};

function recurring(status: Cost["status"] = "planned"): Cost {
  return {
    id: "cost",
    ...validateCostValues({
      ...base,
      costType: "recurring",
      recurrence: "monthly",
      startsOn: "2026-07-01",
      billingAnchorOn: "2026-07-15",
      ownerMemberId: "member",
    }),
    actualAmountMinor: null,
    paidOn: null,
    endedOn: null,
    cancelledOn: null,
    status,
    createdAt: "2026-07-01T00:00:00Z",
    updatedAt: "2026-07-01T00:00:00Z",
  };
}

describe("Cost", () => {
  it("validates one-off and recurring shapes", () => {
    expect(
      validateCostValues({ ...base, costType: "one_off", expectedOn: "2026-08-01" }).currency,
    ).toBe("EUR");
    expect(() =>
      validateCostValues({
        ...base,
        costType: "recurring",
        recurrence: "monthly",
        startsOn: "2026-07-10",
        billingAnchorOn: "2026-07-01",
      }),
    ).toThrow("âncora");
  });

  it("keeps transitions specific to each type", () => {
    expect(activateRecurringCost(recurring()).status).toBe("active");
    expect(endRecurringCost(recurring("active"), "2026-12-31").status).toBe("ended");
    expect(() => payOneOffCost(recurring(), 2500, "2026-07-12")).toThrow("pontual");
  });
});
