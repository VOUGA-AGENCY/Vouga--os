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
import { createProjectModule } from "@/foundation/composition/projects";
import { createRelationsModule } from "@/foundation/composition/relations";
import { withErrorFeedback, withFeedback } from "@/foundation/ui/feedback";

export type CompanyFormState = {
  message: string | null;
};

function valuesFromFormData(formData: FormData) {
  return {
    name: String(formData.get("name") ?? ""),
    status: String(formData.get("status") ?? "active") as CompanyStatus,
    ownerMemberId: String(formData.get("owner_member_id") ?? ""),
    currentContext: String(formData.get("current_context") ?? ""),
    relationshipRisks: String(formData.get("relationship_risks") ?? ""),
    prospectingStage: (String(formData.get("prospecting_stage") ?? "") || null) as ProspectingStage | null,
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
  redirect(withFeedback(returnTo.startsWith("/") ? returnTo : `/companies/${companyId}`, "Organisation criada."));
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
      withErrorFeedback(
        `/companies/${companyId}`,
        getCompanyApplicationErrorMessage(error),
      ),
    );
  }

  redirect(
    withFeedback(
      "/relations?view=organizations",
      "Organisation eliminada.",
    ),
  );
}

export async function closeDealAction(
  companyId: string,
  _previousState: CompanyFormState,
  formData: FormData,
): Promise<CompanyFormState> {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");

  let newProjectId: string;
  try {
    const { service: projectService } = await createProjectModule();
    const { service: companyService, readModel: companyReadModel } = await createCompanyModule();
    const { service: relationsService } = await createRelationsModule();

    const company = await companyReadModel.findById(companyId);
    if (!company) return { message: "Organização não encontrada." };

    const name = String(formData.get("name") ?? "").trim();
    if (!name) return { message: "O nome do Project é obrigatório." };

    const ownerMemberId = String(formData.get("owner_member_id") ?? company.ownerMemberId);
    const startsOn = String(formData.get("starts_on") ?? new Date().toISOString().slice(0, 10));
    const targetDeliveryOn = String(formData.get("target_delivery_on") ?? "");
    const objective = String(formData.get("objective") ?? company.currentContext ?? "").trim();
    const expectedResult = String(formData.get("expected_result") ?? "").trim();
    const agreedAmountStr = String(formData.get("agreed_amount") ?? "").replace(",", ".");
    const agreedAmount = Number(agreedAmountStr);
    if (!Number.isFinite(agreedAmount) || agreedAmount <= 0) {
      return { message: "Indica um valor acordado válido (maior que 0)." };
    }
    const agreedAmountMinor = Math.round(agreedAmount * 100);

    const receivedAmountStr = String(formData.get("received_amount") ?? "0").replace(",", ".");
    const receivedAmount = Number(receivedAmountStr);
    const receivedAmountMinor =
      Number.isFinite(receivedAmount) && receivedAmount >= 0 ? Math.round(receivedAmount * 100) : 0;

    const contactIds = formData.getAll("contact_ids").map(String).filter(Boolean);

    const project = await projectService.createProject({
      name,
      clientCompanyId: companyId,
      ownerMemberId,
      startsOn,
      targetDeliveryOn: targetDeliveryOn || startsOn,
      agreedAmountMinor,
      receivedAmountMinor,
      currency: "EUR",
      objective: objective || `Entrega acordada com ${company.name}.`,
      expectedResult: expectedResult || objective || "Entrega do projeto acordado.",
      nextTaskId: null,
      teamMemberIds: [ownerMemberId],
      contactIds,
      taskIds: [],
      meetingIds: [],
      decisionIds: [],
      costIds: [],
      scopeItems: [],
      outOfScopeItems: [],
      milestones: [],
      resources: [],
    });

    newProjectId = project.id;

    await companyService.setProspectingStage(companyId, "agreed");
    if (company.status !== "active") {
      await companyService.updateCompany(companyId, {
        name: company.name,
        ownerMemberId: company.ownerMemberId,
        status: "active",
        currentContext: company.currentContext,
        relationshipRisks: company.relationshipRisks,
        prospectingStage: "agreed",
        primaryContactId: company.primaryContactId,
      });
    }

    await relationsService.createInteraction({
      companyId,
      contactId: company.primaryContactId ?? (contactIds[0] || null),
      direction: "outbound",
      channel: "call",
      body: `Contrato fechado — Criado o Project "${name}" com valor acordado de ${(agreedAmountMinor / 100).toFixed(2)} EUR.`,
      occurredAt: new Date().toISOString(),
      memberId: user.id,
    });
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    return { message: getCompanyApplicationErrorMessage(error) };
  }

  revalidatePath("/companies");
  revalidatePath(`/companies/${companyId}`);
  revalidatePath("/relations");
  revalidatePath("/projects");
  revalidatePath("/work");
  redirect(withFeedback(`/projects/${newProjectId}`, "Contrato fechado e Project iniciado com sucesso."));
}
