"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  getCompanyApplicationErrorMessage,
  type CompanyService,
} from "@/application/companies/company-service";
import { getAuthenticatedUser } from "@/application/auth/current-user";
import type { CompanyStatus, ProspectingStage } from "@/domain/companies/company";
import { createCompanyModule } from "@/foundation/composition/companies";
import { withErrorFeedback, withFeedback } from "@/foundation/ui/feedback";

export type CompanyFormState = {
  message: string | null;
};

function valuesFromFormData(formData: FormData) {
  return {
    name: String(formData.get("name") ?? ""),
    status: String(formData.get("status") ?? "active") as CompanyStatus,
    ownerMemberId: String(formData.get("owner_member_id") ?? ""),
    primaryCae: String(formData.get("primary_cae") ?? ""),
    contactEmail: String(formData.get("contact_email") ?? ""),
    contactPhone: String(formData.get("contact_phone") ?? ""),
    currentContext: String(formData.get("current_context") ?? ""),
    relationshipRisks: String(formData.get("relationship_risks") ?? ""),
    prospectingStage: (String(formData.get("prospecting_stage") ?? "") ||
      null) as ProspectingStage | null,
    primaryContactId: String(formData.get("primary_contact_id") ?? "") || null,
  };
}

async function requireCompanyService(): Promise<CompanyService | null> {
  if (!(await getAuthenticatedUser())) return null;
  return (await createCompanyModule()).service;
}

export async function createCompanyAction(
  _previousState: CompanyFormState,
  formData: FormData,
): Promise<CompanyFormState> {
  const service = await requireCompanyService();
  if (!service) return { message: "A sessão terminou. Volta a entrar." };

  let companyId: string;
  try {
    const company = await service.createCompany(valuesFromFormData(formData));
    companyId = company.id;
  } catch (error) {
    return { message: getCompanyApplicationErrorMessage(error) };
  }

  revalidatePath("/companies");
  const returnTo = String(formData.get("return_to") ?? "");
  redirect(
    withFeedback(
      returnTo.startsWith("/") ? returnTo : `/companies/${companyId}`,
      "Organisation criada.",
    ),
  );
}

export async function updateCompanyAction(
  companyId: string,
  _previousState: CompanyFormState,
  formData: FormData,
): Promise<CompanyFormState> {
  const service = await requireCompanyService();
  if (!service) return { message: "A sessão terminou. Volta a entrar." };

  try {
    await service.updateCompany(companyId, valuesFromFormData(formData));
  } catch (error) {
    return { message: getCompanyApplicationErrorMessage(error) };
  }

  revalidatePath("/companies");
  revalidatePath(`/companies/${companyId}`);
  redirect(withFeedback(`/companies/${companyId}`, "Alterações guardadas."));
}

export async function archiveCompanyAction(companyId: string): Promise<void> {
  const service = await requireCompanyService();
  if (!service) redirect("/login");

  await service.archiveCompany(companyId);
  revalidatePath("/companies");
  revalidatePath(`/companies/${companyId}`);
  redirect(withFeedback(`/companies/${companyId}`, "Organisation arquivada."));
}

export async function deleteCompanyAction(companyId: string): Promise<void> {
  const service = await requireCompanyService();
  if (!service) redirect("/login");

  try {
    await service.deleteCompany(companyId);
    revalidatePath("/relations");
    revalidatePath("/companies");
  } catch (error) {
    redirect(
      withErrorFeedback(`/companies/${companyId}`, getCompanyApplicationErrorMessage(error)),
    );
  }

  redirect(withFeedback("/relations?view=organizations", "Organisation eliminada."));
}
