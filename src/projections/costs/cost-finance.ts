import type { CashBalanceSnapshot } from "@/application/costs/contracts";
import type { CostListItem } from "./cost-read-model";

export type CostConfidence = "confirmed" | "expected" | "derived";

export type CostOccurrence = Readonly<{
  costId: string;
  title: string;
  amountMinor: number;
  currency: string;
  occursOn: string;
  confidence: CostConfidence;
}>;

export type CostPeriodTotal = Readonly<{
  key: string;
  currency: string;
  amountMinor: number;
  confirmedMinor: number;
  expectedMinor: number;
  derivedMinor: number;
}>;

export type CashPosition = Readonly<{
  currency: string;
  confirmedBalanceMinor: number;
  confirmedAt: string;
  estimatedBalanceMinor: number;
  projectedBalanceMinor: number;
  runwayMonths: number | null;
  runwayExhaustedOn: string | null;
}>;

const DAY = 86_400_000;

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function atUtc(value: string) {
  return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
}

function addMonths(value: string, amount: number, anchorDay = atUtc(value).getUTCDate()) {
  const base = atUtc(value);
  const target = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + amount, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(anchorDay, lastDay));
  return isoDate(target);
}

function recurringStep(recurrence: CostListItem["recurrence"]) {
  if (recurrence === "monthly") return 1;
  if (recurrence === "quarterly") return 3;
  return 12;
}

export function deriveCostOccurrences(
  costs: readonly CostListItem[],
  from: string,
  to: string,
): CostOccurrence[] {
  const occurrences: CostOccurrence[] = [];
  for (const cost of costs) {
    if (cost.status === "cancelled") continue;
    if (cost.costType === "one_off") {
      const occursOn = cost.paidOn ?? cost.expectedOn;
      if (!occursOn || occursOn < from || occursOn > to) continue;
      occurrences.push({
        costId: cost.id,
        title: cost.title,
        amountMinor: cost.actualAmountMinor ?? cost.expectedAmountMinor,
        currency: cost.currency,
        occursOn,
        confidence: cost.status === "paid" ? "confirmed" : "expected",
      });
      continue;
    }
    if (!cost.billingAnchorOn || !cost.recurrence || cost.status === "planned") continue;
    const terminal = cost.endedOn ?? cost.cancelledOn ?? to;
    const effectiveTo = terminal < to ? terminal : to;
    let occurrence = cost.billingAnchorOn;
    const anchorDay = atUtc(cost.billingAnchorOn).getUTCDate();
    const step = recurringStep(cost.recurrence);
    let elapsed = 0;
    while (occurrence < from) {
      elapsed += step;
      occurrence = addMonths(cost.billingAnchorOn, elapsed, anchorDay);
    }
    while (occurrence <= effectiveTo) {
      if (!cost.startsOn || occurrence >= cost.startsOn) {
        occurrences.push({
          costId: cost.id,
          title: cost.title,
          amountMinor: cost.expectedAmountMinor,
          currency: cost.currency,
          occursOn: occurrence,
          confidence: "derived",
        });
      }
      elapsed += step;
      occurrence = addMonths(cost.billingAnchorOn, elapsed, anchorDay);
    }
  }
  return occurrences.sort((a, b) => a.occursOn.localeCompare(b.occursOn));
}

export function groupCostTotals(
  occurrences: readonly CostOccurrence[],
  period: "month" | "year",
): CostPeriodTotal[] {
  const totals = new Map<string, CostPeriodTotal>();
  for (const item of occurrences) {
    const periodKey = item.occursOn.slice(0, period === "month" ? 7 : 4);
    const key = `${periodKey}:${item.currency}`;
    const current = totals.get(key) ?? {
      key: periodKey,
      currency: item.currency,
      amountMinor: 0,
      confirmedMinor: 0,
      expectedMinor: 0,
      derivedMinor: 0,
    };
    totals.set(key, {
      ...current,
      amountMinor: current.amountMinor + item.amountMinor,
      confirmedMinor:
        current.confirmedMinor + (item.confidence === "confirmed" ? item.amountMinor : 0),
      expectedMinor:
        current.expectedMinor + (item.confidence === "expected" ? item.amountMinor : 0),
      derivedMinor: current.derivedMinor + (item.confidence === "derived" ? item.amountMinor : 0),
    });
  }
  return [...totals.values()].sort((a, b) => a.key.localeCompare(b.key));
}

export function calculateCashPositions(
  snapshots: readonly CashBalanceSnapshot[],
  occurrences: readonly CostOccurrence[],
  today: string,
  projectionEnd: string,
): CashPosition[] {
  const latest = new Map<string, CashBalanceSnapshot>();
  for (const snapshot of snapshots) {
    const current = latest.get(snapshot.currency);
    if (!current || snapshot.confirmedAt > current.confirmedAt) {
      latest.set(snapshot.currency, snapshot);
    }
  }

  return [...latest.values()].map((snapshot) => {
    const afterSnapshot = occurrences.filter(
      (item) =>
        item.currency === snapshot.currency &&
        item.occursOn > snapshot.confirmedAt.slice(0, 10) &&
        item.occursOn <= projectionEnd,
    );
    const spentToDate = afterSnapshot
      .filter((item) => item.occursOn <= today)
      .reduce((sum, item) => sum + item.amountMinor, 0);
    const estimatedBalanceMinor = snapshot.balanceMinor - spentToDate;
    let balance = estimatedBalanceMinor;
    let exhausted: string | null = balance <= 0 ? today : null;
    for (const item of afterSnapshot.filter((item) => item.occursOn > today)) {
      balance -= item.amountMinor;
      if (balance <= 0 && !exhausted) exhausted = item.occursOn;
    }
    return {
      currency: snapshot.currency,
      confirmedBalanceMinor: snapshot.balanceMinor,
      confirmedAt: snapshot.confirmedAt,
      estimatedBalanceMinor,
      projectedBalanceMinor: balance,
      runwayMonths: exhausted
        ? Math.max(
            0,
            Math.round(((atUtc(exhausted).getTime() - atUtc(today).getTime()) / DAY / 30.44) * 10) /
              10,
          )
        : null,
      runwayExhaustedOn: exhausted,
    };
  });
}
