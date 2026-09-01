"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/application/auth/current-user";
import {
  contactValuesFromInput,
  getRelationsErrorMessage,
} from "@/application/relations/relations-service";
import { getCompanyApplicationErrorMessage } from "@/application/companies/company-service";
import type { ContactChannel } from "@/domain/relations/contact";
import type { ProspectingStage } from "@/domain/companies/company";
import { createCompanyModule } from "@/foundation/composition/companies";
import { createRelationsModule } from "@/foundation/composition/relations";
import { safeWorkspaceReturnTo } from "@/foundation/navigation/return-to";
import { withErrorFeedback, withFeedback } from "@/foundation/ui/feedback";
export type RelationsFormState = { message: string | null };
const RELATIONS_GENERIC_ERROR = "Não foi possível guardar esta relação.";
const formErrorMessage = (error: unknown) => {
  const relationMessage = getRelationsErrorMessage(error);
  return relationMessage === RELATIONS_GENERIC_ERROR
    ? getCompanyApplicationErrorMessage(error)
    : relationMessage;
};
const fields = (fd: FormData) =>
  contactValuesFromInput(
    Object.fromEntries(
      [
        "display_name",
        "company_id",
        "owner_member_id",
        "relationship_role",
        "job_title",
        "email",
        "linkedin_url",
        "phone",
        "avatar_url",
        "important_context",
      ].map((key) => [key, String(fd.get(key) ?? "")]),
    ),
  );
async function fieldsWithInlineOrganisation(fd: FormData, fallbackOwnerMemberId: string) {
  const values = fields(fd);
  const newCompanyName = String(fd.get("new_company_name") ?? "").trim();
  if (!newCompanyName) return values;

  const { service } = await createCompanyModule();
  const company = await service.createCompany({
    name: newCompanyName,
    status: "active",
    ownerMemberId: values.ownerMemberId || fallbackOwnerMemberId,
    primaryCae: String(fd.get("new_company_primary_cae") ?? ""),
    contactEmail: String(fd.get("new_company_contact_email") ?? ""),
    contactPhone: String(fd.get("new_company_contact_phone") ?? ""),
    currentContext: null,
    relationshipRisks: null,
    prospectingStage: fd.get("prospecting_context") === "1" ? "to_contact" : null,
    primaryContactId: null,
  });

  return { ...values, companyId: company.id };
}
export async function createContactAction(
  _: RelationsFormState,
  fd: FormData,
): Promise<RelationsFormState> {
  const user = await getAuthenticatedUser();
  if (!user) return { message: "A sessão terminou." };
  let contactId: string;
  try {
    const { service } = await createRelationsModule();
    const values = await fieldsWithInlineOrganisation(fd, user.id);
    const contact = await service.createContact(values);
    contactId = contact.id;
    if (fd.get("set_as_primary") === "1" && contact.companyId) {
      const { service: companyService } = await createCompanyModule();
      const company = await companyService.getCompany(contact.companyId);
      if (!company.primaryContactId)
        await companyService.setPrimaryContact(contact.companyId, contact.id);
      if (!company.prospectingStage)
        await companyService.setProspectingStage(contact.companyId, "to_contact");
    }
    revalidatePath("/relations");
    revalidatePath("/companies");
  } catch (error) {
    return { message: formErrorMessage(error) };
  }
  const returnTo = String(fd.get("return_to") ?? "");
  redirect(
    withFeedback(
      returnTo.startsWith("/") ? returnTo : `/relations/contacts/${contactId}`,
      "Perfil criado.",
    ),
  );
}
export async function updateContactAction(
  id: string,
  _: RelationsFormState,
  fd: FormData,
): Promise<RelationsFormState> {
  const user = await getAuthenticatedUser();
  if (!user) return { message: "A sessão terminou." };
  try {
    const { service } = await createRelationsModule();
    await service.updateContact(id, await fieldsWithInlineOrganisation(fd, user.id));
    revalidatePath("/relations");
    revalidatePath("/companies");
    revalidatePath(`/relations/contacts/${id}`);
  } catch (error) {
    return { message: formErrorMessage(error) };
  }
  redirect(withFeedback(`/relations/contacts/${id}`, "Perfil atualizado."));
}
export async function archiveContactAction(id: string) {
  const { service } = await createRelationsModule();
  await service.archiveContact(id);
  revalidatePath("/relations");
  redirect(withFeedback("/relations", "Contact arquivado."));
}
export async function deleteContactAction(id: string) {
  if (!(await getAuthenticatedUser())) redirect("/login");
  const { service } = await createRelationsModule();
  try {
    await service.deleteContact(id);
  } catch (error) {
    redirect(withErrorFeedback(`/relations/contacts/${id}`, getRelationsErrorMessage(error)));
  }
  revalidatePath("/relations");
  revalidatePath("/companies");
  redirect(withFeedback("/relations?view=profiles", "Perfil eliminado."));
}
export async function createTemplateAction(fd: FormData) {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");
  const { service } = await createRelationsModule();
  await service.createTemplate({
    name: String(fd.get("name") ?? ""),
    channel: String(fd.get("channel") ?? "email") as ContactChannel,
    situation: String(fd.get("situation") ?? ""),
    body: String(fd.get("body") ?? ""),
    memberId: user.id,
  });
  revalidatePath("/relations");
  redirect(withFeedback("/relations?view=scripts", "Guião guardado."));
}

export async function updateProspectingStageAction(companyId: string, fd: FormData) {
  if (!(await getAuthenticatedUser())) redirect("/login");
  const stage = String(fd.get("stage") ?? "to_contact") as ProspectingStage;
  const { service } = await createCompanyModule();
  await service.setProspectingStage(companyId, stage);
  revalidatePath("/relations");
  revalidatePath(`/companies/${companyId}`);
  redirect(withFeedback("/relations", "Estado atualizado."));
}

export async function setPrimaryContactAction(companyId: string, fd: FormData) {
  if (!(await getAuthenticatedUser())) redirect("/login");
  const { service } = await createCompanyModule();
  await service.setPrimaryContact(companyId, String(fd.get("contact_id") ?? "") || null);
  revalidatePath("/relations");
  revalidatePath(`/companies/${companyId}`);
  redirect(withFeedback("/relations", "Contacto principal atualizado."));
}

export async function recordProspectingTouchAction(companyId: string, fd: FormData) {
  if (!(await getAuthenticatedUser())) redirect("/login");
  const { service } = await createRelationsModule();
  await service.recordProspectingTouch({
    companyId,
    contactId: String(fd.get("contact_id") ?? ""),
    channel: String(fd.get("channel") ?? "linkedin") as ContactChannel,
    note: String(fd.get("note") ?? ""),
    nextStep: String(fd.get("next_step") ?? ""),
    followUpAt: String(fd.get("follow_up_at") ?? ""),
  });
  revalidatePath("/relations");
  revalidatePath("/tasks");
  revalidatePath(`/companies/${companyId}`);
  redirect(withFeedback("/relations", "Contacto registado."));
}

export async function recordContactInteractionAction(fd: FormData) {
  if (!(await getAuthenticatedUser())) redirect("/login");
  const companyId = String(fd.get("company_id") ?? "").trim();
  const contactId = String(fd.get("contact_id") ?? "").trim() || null;
  const returnTo = safeWorkspaceReturnTo(
    String(fd.get("return_to") ?? ""),
    "/relations?segment=prospecting",
  );
  try {
    const { service } = await createRelationsModule();
    await service.recordContactInteraction({
      companyId,
      contactId,
      channel: String(fd.get("channel") ?? "linkedin") as ContactChannel,
      body: String(fd.get("body") ?? ""),
      sourceTemplateId: String(fd.get("source_template_id") ?? "") || null,
      stage: String(fd.get("stage") ?? "contacted") as ProspectingStage,
    });
  } catch (error) {
    redirect(withErrorFeedback(returnTo, getRelationsErrorMessage(error)));
  }
  revalidatePath("/relations");
  revalidatePath("/companies");
  revalidatePath(`/companies/${companyId}`);
  if (contactId) revalidatePath(`/relations/contacts/${contactId}`);
  redirect(withFeedback(returnTo, "Interação registada."));
}
