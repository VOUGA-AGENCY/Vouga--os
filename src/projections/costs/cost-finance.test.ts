import { describe, expect, it } from "vitest";
import type { CashBalanceSnapshot } from "@/application/costs/contracts";
import type { CostListItem } from "./cost-read-model";
import { calculateCashPositions, deriveCostOccurrences, groupCostTotals } from "./cost-finance";

function cost(values: Partial<CostListItem>): CostListItem {
  return {
    id: "cost",
    title: "Infra",
    description: "Infraestrutura",
    category: "infrastructure",
    supplier: null,
    expectedAmountMinor: 1000,
    actualAmountMinor: null,
    currency: "EUR",
    costType: "recurring",
    recurrence: "monthly",
    expectedOn: null,
    startsOn: "2026-01-01",
    billingAnchorOn: "2026-01-31",
    paidOn: null,
    endedOn: null,
    cancelledOn: null,
    status: "active",
    ownerMemberId: "member-1",
    ownerDisplayName: "Miguel",
    companyName: null,
    roadmapItemTitle: null,
    sourceDecisionTitle: null,
    taskCount: 0,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...values,
  };
}

describe("Cost finance projections", () => {
  it("derives recurring dates without drifting at the end of a month", () => {
    const dates = deriveCostOccurrences([cost({})], "2026-01-01", "2026-04-30").map(
      (item) => item.occursOn,
    );
    expect(dates).toEqual(["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]);
  });

  it("separates confirmed, expected and derived totals", () => {
    const occurrences = deriveCostOccurrences(
      [
        cost({}),
        cost({
          id: "paid",
          costType: "one_off",
          recurrence: null,
          startsOn: null,
          billingAnchorOn: null,
          expectedOn: "2026-02-03",
          paidOn: "2026-02-04",
          actualAmountMinor: 2500,
          status: "paid",
        }),
      ],
      "2026-02-01",
      "2026-02-28",
    );
    expect(groupCostTotals(occurrences, "month")[0]).toMatchObject({
      amountMinor: 3500,
      confirmedMinor: 2500,
      derivedMinor: 1000,
    });
  });

  it("calculates estimated balance and cost-only runway per currency", () => {
    const snapshot: CashBalanceSnapshot = {
      id: "snapshot",
      balanceMinor: 3000,
      currency: "EUR",
      confirmedAt: "2026-01-01T12:00:00Z",
      confirmedByMemberId: "member",
      confirmedByDisplayName: "Miguel",
      description: null,
      createdAt: "2026-01-01T12:00:00Z",
    };
    const occurrences = deriveCostOccurrences(
      [cost({ billingAnchorOn: "2026-01-15" })],
      "2026-01-01",
      "2026-06-30",
    );
    expect(
      calculateCashPositions([snapshot], occurrences, "2026-01-20", "2026-06-30")[0],
    ).toMatchObject({
      estimatedBalanceMinor: 2000,
      projectedBalanceMinor: -3000,
      runwayExhaustedOn: "2026-03-15",
    });
  });
});
