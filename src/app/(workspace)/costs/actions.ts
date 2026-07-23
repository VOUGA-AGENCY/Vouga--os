"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCostApplicationErrorMessage } from "@/application/costs/cost-service";
import { requireGovernanceAccess } from "@/application/governance/require-governance-access";
import type { CostCategory, CostRecurrence, CostType, CostValues } from "@/domain/costs/cost";
import { createCostModule } from "@/foundation/composition/costs";
import { withFeedback } from "@/foundation/ui/feedback";

export type CostFormState = { message: string | null };
function amount(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "")
    .trim()
    .replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}
function values(form: FormData): CostValues {
  return {
    title: String(form.get("title") ?? ""),
    description: String(form.get("description") ?? ""),
    category: String(form.get("category") ?? "") as CostCategory,
    supplier: String(form.get("supplier") ?? "") || null,
    expectedAmountMinor: amount(form.get("expected_amount")),
    currency: String(form.get("currency") ?? "EUR"),
    costType: String(form.get("cost_type") ?? "one_off") as CostType,
    recurrence: (String(form.get("recurrence") ?? "") || null) as CostRecurrence | null,
    expectedOn: String(form.get("expected_on") ?? "") || null,
    startsOn: String(form.get("starts_on") ?? "") || null,
    billingAnchorOn: String(form.get("billing_anchor_on") ?? "") || null,
    ownerMemberId: String(form.get("owner_member_id") ?? "") || null,
    companyId: String(form.get("company_id") ?? "") || null,
    roadmapItemId: String(form.get("roadmap_item_id") ?? "") || null,
    sourceDecisionId: String(form.get("source_decision_id") ?? "") || null,
    taskIds: form.getAll("task_id").map(String),
  };
}
function refresh(id?: string) {
  revalidatePath("/costs");
  revalidatePath("/");
  if (id) revalidatePath(`/costs/${id}`);
}
export async function createCostAction(_: CostFormState, form: FormData): Promise<CostFormState> {
  try {
    await requireGovernanceAccess("/costs/new");
    const { service } = await createCostModule();
    const cost = await service.createCost(values(form));
    refresh(cost.id);
    redirect(withFeedback(`/costs/${cost.id}`, "Cost criado."));
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    return { message: getCostApplicationErrorMessage(error) };
  }
}
export async function updateCostAction(
  id: string,
  _: CostFormState,
  form: FormData,
): Promise<CostFormState> {
  try {
    await requireGovernanceAccess(`/costs/${id}/edit`);
    const { service } = await createCostModule();
    await service.updateCost(id, values(form));
    refresh(id);
    redirect(withFeedback(`/costs/${id}`, "Alterações guardadas."));
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    return { message: getCostApplicationErrorMessage(error) };
  }
}
export async function activateCostAction(id: string) {
  await requireGovernanceAccess(`/costs/${id}`);
  const { service } = await createCostModule();
  await service.activateCost(id);
  refresh(id);
  redirect(withFeedback(`/costs/${id}`, "Cost recorrente ativado."));
}
export async function payCostAction(id: string, form: FormData) {
  await requireGovernanceAccess(`/costs/${id}`);
  const { service } = await createCostModule();
  await service.payCost(id, amount(form.get("actual_amount")), String(form.get("paid_on") ?? ""));
  refresh(id);
  redirect(withFeedback(`/costs/${id}`, "Cost marcado como pago."));
}
export async function endCostAction(id: string, form: FormData) {
  await requireGovernanceAccess(`/costs/${id}`);
  const { service } = await createCostModule();
  await service.endCost(id, String(form.get("ended_on") ?? ""));
  refresh(id);
  redirect(withFeedback(`/costs/${id}`, "Cost recorrente terminado."));
}
export async function cancelCostAction(id: string, form: FormData) {
  await requireGovernanceAccess(`/costs/${id}`);
  const { service } = await createCostModule();
  await service.cancelCost(id, String(form.get("cancelled_on") ?? ""));
  refresh(id);
  redirect(withFeedback("/costs", "Cost cancelado."));
}
export async function cancelCostTodayAction(id: string, today: string) {
  await requireGovernanceAccess(`/costs/${id}`);
  const { service } = await createCostModule();
  await service.cancelCost(id, today);
  refresh(id);
  redirect(withFeedback("/costs", "Cost cancelado."));
}
export async function recordCashBalanceAction(
  _: CostFormState,
  form: FormData,
): Promise<CostFormState> {
  try {
    await requireGovernanceAccess("/costs");
    const { service } = await createCostModule();
    await service.recordCashBalance({
      balanceMinor: amount(form.get("balance")),
      currency: String(form.get("currency") ?? "EUR"),
      confirmedAt: String(form.get("confirmed_at") ?? ""),
      confirmedByMemberId: String(form.get("confirmed_by_member_id") ?? ""),
      description: String(form.get("description") ?? "") || null,
    });
    refresh();
    redirect(withFeedback("/costs", "Saldo confirmado."));
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    return { message: getCostApplicationErrorMessage(error) };
  }
}
