"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { ActiveMember } from "@/application/companies/contracts";
import { PROSPECTING_STAGE_LABELS, PROSPECTING_STAGES } from "@/domain/companies/company";
import { FormFeedback, FormFields, FormSubmit } from "@/foundation/ui/form-controls";
import type { CompanyDetail } from "@/projections/companies/company-read-model";
import type { CompanyFormState } from "./actions";

type CompanyFormAction = (state: CompanyFormState, formData: FormData) => Promise<CompanyFormState>;

export function CompanyForm({ action, company, defaultOwnerId, owners, defaultProspectingStage, returnTo }: {
  action: CompanyFormAction;
  company?: CompanyDetail;
  defaultOwnerId?: string;
  owners: ActiveMember[];
  defaultProspectingStage?: "to_contact";
  returnTo?: string;
}) {
  const [state, formAction] = useActionState(action, { message: null });
  const archived = company?.status === "archived";
  const cancelHref = returnTo?.startsWith("/") ? returnTo : company ? `/companies/${company.id}` : "/relations?view=organizations";

  return <form action={formAction} className="crm-editor crm-company-editor">
    <input name="primary_contact_id" type="hidden" value={company?.primaryContactId ?? ""} />
    <input name="return_to" type="hidden" value={returnTo ?? ""} />
    <FormFields>
      <section className="crm-editor-group">
        <div className="crm-editor-grid">
          <div className="field field-light crm-span-2"><label htmlFor="name">Nome</label><input autoFocus defaultValue={company?.name} id="name" maxLength={160} name="name" placeholder="Nome da organização" required /></div>
          <div className="field field-light"><label htmlFor="owner_member_id">Owner</label><select defaultValue={company?.ownerMemberId ?? defaultOwnerId ?? owners[0]?.id} id="owner_member_id" name="owner_member_id" required>{owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.displayName}</option>)}</select></div>
          <div className="field field-light"><label htmlFor="prospecting_stage">Prospeção</label><select defaultValue={company?.prospectingStage ?? defaultProspectingStage ?? ""} id="prospecting_stage" name="prospecting_stage"><option value="">Fora da prospeção</option>{PROSPECTING_STAGES.map((stage) => <option key={stage} value={stage}>{PROSPECTING_STAGE_LABELS[stage]}</option>)}</select></div>
        </div>
      </section>

      <section className="crm-editor-group">
        <header><h2>Notas</h2></header>
        <div className="field field-light"><textarea defaultValue={company?.currentContext ?? ""} id="current_context" maxLength={4000} name="current_context" placeholder="O que importa saber sobre esta organização." rows={5} /></div>
      </section>

      <details className="crm-editor-more">
        <summary>Mais opções</summary>
        <div className="crm-editor-grid">
          <div className="field field-light"><label htmlFor="status">Estado da organização</label><select defaultValue={company?.status ?? "active"} id="status" name="status">{archived ? <option value="archived">Arquivada</option> : <><option value="active">Ativa</option><option value="inactive">Inativa</option></>}</select></div>
          <div className="field field-light"><label htmlFor="relationship_risks">Riscos da relação</label><textarea defaultValue={company?.relationshipRisks ?? ""} id="relationship_risks" maxLength={4000} name="relationship_risks" placeholder="Opcional" rows={3} /></div>
        </div>
      </details>
    </FormFields>
    <FormFeedback message={state.message} />
    <div className="crm-editor-actions"><Link className="button-secondary" href={cancelHref}>Cancelar</Link><FormSubmit idleLabel={company ? "Guardar alterações" : "Criar organização"} /></div>
  </form>;
}
