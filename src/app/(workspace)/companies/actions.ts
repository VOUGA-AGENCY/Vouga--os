"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  getCompanyApplicationErrorMessage,
  type CompanyService,
} from "@/application/companies/company-service";
import { getAuthenticatedUser } from "@/application/auth/current-user";
import {
  validateCompanyValues,
  type CompanyStatus,
  type ProspectingStage,
} from "@/domain/companies/company";
import { validateProjectValues } from "@/domain/projects/project";
import { createCompanyModule } from "@/foundation/composition/companies";
import { createProjectModule } from "@/foundation/composition/projects";
import { createRelationsModule } from "@/foundation/composition/relations";
import { createClient } from "@/persistence/supabase/server";
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
    website: String(formData.get("website") ?? ""),
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

    // 1. Resolve real company fields (never invent fake data)
    const formCae = String(formData.get("company_cae") ?? "").trim();
    const formEmail = String(formData.get("company_email") ?? "").trim();
    const formPhone = String(formData.get("company_phone") ?? "").trim();
    const formWebsite = String(formData.get("company_website") ?? "").trim();

    const finalCae = formCae || company.primaryCae || "";
    const finalEmail = formEmail || company.contactEmail || null;
    const finalPhone = formPhone || company.contactPhone || null;
    const finalWebsite = formWebsite || company.website || null;

    // Validate company requirements if activating
    if (company.status !== "active") {
      if (!finalCae) {
        return { message: "O CAE principal é obrigatório para ativar a Organização." };
      }
      if (!finalEmail && !finalPhone) {
        return {
          message:
            "Indica pelo menos um email ou telefone de contacto válido para a Organização.",
        };
      }
      validateCompanyValues({
        name: company.name,
        ownerMemberId: company.ownerMemberId,
        primaryCae: finalCae,
        contactEmail: finalEmail,
        contactPhone: finalPhone,
        website: finalWebsite,
        status: "active",
        prospectingStage: "agreed",
        currentContext: company.currentContext,
        relationshipRisks: company.relationshipRisks,
        primaryContactId: company.primaryContactId,
      });
    }

    // 2. Validate Project Values in domain BEFORE any database mutation
    const validProject = validateProjectValues({
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

    const logInteraction = formData.get("log_interaction") === "yes";
    const interactionNote = String(formData.get("interaction_note") ?? "").trim();
    const interactionBody = interactionNote
      ? `Contrato fechado — Project "${name}" (${(agreedAmountMinor / 100).toFixed(2)} EUR). ${interactionNote}`
      : `Contrato fechado — Criado o Project "${name}" com valor acordado de ${(agreedAmountMinor / 100).toFixed(2)} EUR.`;

    // 3. Execute atomically via RPC or compensating rollback
    const supabase = await createClient();
    const { data: rpcProjectId, error: rpcError } = await supabase.rpc("close_company_deal", {
      p_company_id: companyId,
      p_project_values: {
        name: validProject.name,
        client_company_id: companyId,
        owner_member_id: validProject.ownerMemberId,
        starts_on: validProject.startsOn,
        target_delivery_on: validProject.targetDeliveryOn,
        agreed_amount_minor: validProject.agreedAmountMinor,
        received_amount_minor: validProject.receivedAmountMinor,
        currency: validProject.currency,
        objective: validProject.objective,
        expected_result: validProject.expectedResult,
        next_task_id: null,
      },
      p_member_ids: validProject.teamMemberIds,
      p_contact_ids: validProject.contactIds,
      p_task_ids: [],
      p_meeting_ids: [],
      p_decision_ids: [],
      p_cost_ids: [],
      p_scope_items: [],
      p_out_of_scope_items: [],
      p_milestones: [],
      p_resources: [],
      p_company_cae: finalCae || null,
      p_company_email: finalEmail || null,
      p_company_phone: finalPhone || null,
      p_company_website: finalWebsite || null,
      p_update_company_status: true,
      p_log_interaction: logInteraction,
      p_interaction_body: interactionBody,
      p_interaction_contact_id: company.primaryContactId ?? (contactIds[0] || null),
    });

    if (!rpcError && typeof rpcProjectId === "string") {
      newProjectId = rpcProjectId;
    } else {
      // Fallback: execute with compensating rollback to guarantee atomicity
      let createdId: string | null = null;
      try {
        const project = await projectService.createProject(validProject);
        createdId = project.id;

        if (company.status !== "active" || (finalCae && finalCae !== company.primaryCae) || (finalEmail && finalEmail !== company.contactEmail)) {
          await companyService.updateCompany(companyId, {
            name: company.name,
            ownerMemberId: company.ownerMemberId,
            status: "active",
            primaryCae: finalCae,
            contactEmail: finalEmail,
            contactPhone: finalPhone,
            website: finalWebsite,
            currentContext: company.currentContext,
            relationshipRisks: company.relationshipRisks,
            prospectingStage: "agreed",
            primaryContactId: company.primaryContactId,
          });
        } else {
          await companyService.setProspectingStage(companyId, "agreed");
        }

        if (logInteraction) {
          await relationsService.createInteraction({
            companyId,
            contactId: company.primaryContactId ?? (contactIds[0] || null),
            direction: "outbound",
            channel: "call",
            body: interactionBody,
            occurredAt: new Date().toISOString(),
            memberId: user.id,
          });
        }
        newProjectId = project.id;
      } catch (fallbackError) {
        // Rollback project if subsequent step failed
        if (createdId) {
          try {
            await supabase.from("projects").delete().eq("id", createdId);
          } catch {
            // ignore cleanup failure
          }
        }
        throw fallbackError;
      }
    }
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
