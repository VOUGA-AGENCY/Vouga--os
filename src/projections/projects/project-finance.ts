import { deriveCostOccurrences } from "@/projections/costs/cost-finance";

import type { ProjectDetail } from "./project-read-model";

export type ProjectExternalCostTotal = Readonly<{
  currency: string;
  amountMinor: number;
  confirmedMinor: number;
  expectedMinor: number;
  derivedMinor: number;
}>;

export type ProjectFinancialSummary = Readonly<{
  agreedAmountMinor: number;
  receivedAmountMinor: number;
  receivableAmountMinor: number;
  currency: string;
  externalCosts: readonly ProjectExternalCostTotal[];
}>;

export function projectFinancialSummary(project: ProjectDetail): ProjectFinancialSummary {
  const occurrences = deriveCostOccurrences(
    project.costs,
    project.startsOn,
    project.targetDeliveryOn,
  );
  const totals = new Map<string, ProjectExternalCostTotal>();
  for (const occurrence of occurrences) {
    const current = totals.get(occurrence.currency) ?? {
      currency: occurrence.currency,
      amountMinor: 0,
      confirmedMinor: 0,
      expectedMinor: 0,
      derivedMinor: 0,
    };
    totals.set(occurrence.currency, {
      ...current,
      amountMinor: current.amountMinor + occurrence.amountMinor,
      confirmedMinor:
        current.confirmedMinor +
        (occurrence.confidence === "confirmed" ? occurrence.amountMinor : 0),
      expectedMinor:
        current.expectedMinor + (occurrence.confidence === "expected" ? occurrence.amountMinor : 0),
      derivedMinor:
        current.derivedMinor + (occurrence.confidence === "derived" ? occurrence.amountMinor : 0),
    });
  }
  return {
    agreedAmountMinor: project.agreedAmountMinor,
    receivedAmountMinor: project.receivedAmountMinor,
    receivableAmountMinor: project.agreedAmountMinor - project.receivedAmountMinor,
    currency: project.currency,
    externalCosts: [...totals.values()].sort((left, right) =>
      left.currency.localeCompare(right.currency),
    ),
  };
}
