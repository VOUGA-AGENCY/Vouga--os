"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getDecisionApplicationErrorMessage } from "@/application/decisions/decision-service";
import type { DecisionReviewEffect, DecisionValues } from "@/domain/decisions/decision";
import { createDecisionModule } from "@/foundation/composition/decisions";
import { withFeedback } from "@/foundation/ui/feedback";

export type DecisionFormState = { message: string | null };

function values(form: FormData): DecisionValues {
  return {
    title: String(form.get("title") ?? ""),
    choice: String(form.get("choice") ?? ""),
    reason: String(form.get("reason") ?? ""),
    alternatives: String(form.get("alternatives") ?? "") || null,
    impact: String(form.get("impact") ?? ""),
    authorityMemberId: String(form.get("authority_member_id") ?? ""),
    decidedOn: String(form.get("decided_on") ?? ""),
    originMeetingId: String(form.get("origin_meeting_id") ?? "") || null,
    companyIds: form.getAll("company_id").map(String),
    meetingIds: form.getAll("meeting_id").map(String),
    taskIds: form.getAll("task_id").map(String),
  };
}

function refresh(id: string) {
  revalidatePath("/decisions");
  revalidatePath(`/decisions/${id}`);
  revalidatePath("/companies");
  revalidatePath("/meetings");
  revalidatePath("/tasks");
}

export async function createDecisionAction(
  _: DecisionFormState,
  form: FormData,
): Promise<DecisionFormState> {
  try {
    const { service } = await createDecisionModule();
    const decision = await service.createDecision(values(form));
    refresh(decision.id);
    redirect(withFeedback(`/decisions/${decision.id}`, "Decision registada."));
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    return { message: getDecisionApplicationErrorMessage(error) };
  }
}

export async function reviewDecisionAction(
  previousDecisionId: string,
  _: DecisionFormState,
  form: FormData,
): Promise<DecisionFormState> {
  try {
    const { service } = await createDecisionModule();
    const decision = await service.reviewDecision(
      previousDecisionId,
      String(form.get("review_effect") ?? "") as DecisionReviewEffect,
      values(form),
    );
    refresh(previousDecisionId);
    refresh(decision.id);
    redirect(withFeedback(`/decisions/${decision.id}`, "Revisão registada."));
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    return { message: getDecisionApplicationErrorMessage(error) };
  }
}
