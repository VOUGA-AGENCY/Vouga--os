"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { AlertCircle } from "lucide-react";

import type { CompanyFormState } from "../../actions";
import type { ProjectListItem } from "@/projections/projects/project-read-model";
import { PROJECT_STATUS_LABELS } from "@/domain/projects/project";

type CloseDealFormProps = {
  action: (state: CompanyFormState, formData: FormData) => Promise<CompanyFormState>;
  company: {
    id: string;
    name: string;
    ownerMemberId: string;
    currentContext: string | null;
    status: string;
    primaryCae: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    website: string | null;
  };
  contacts: readonly Readonly<{
    id: string;
    displayName: string;
    jobTitle: string | null;
  }>[];
  members: readonly Readonly<{
    id: string;
    displayName: string;
  }>[];
  existingProjects: readonly ProjectListItem[];
  defaultStartsOn: string;
  defaultTargetDeliveryOn: string;
};

export function CloseDealForm({
  action,
  company,
  contacts,
  members,
  existingProjects,
  defaultStartsOn,
  defaultTargetDeliveryOn,
}: CloseDealFormProps) {
  const [state, formAction, isPending] = useActionState(action, { message: null });
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(
    () => new Set(contacts.map((c) => c.id)),
  );
  const [logInteraction, setLogInteraction] = useState(true);

  const needsCae = company.status !== "active" && !company.primaryCae;
  const needsContact =
    company.status !== "active" && !company.contactEmail && !company.contactPhone;

  const toggleContact = (id: string) => {
    setSelectedContacts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <form action={formAction} className="company-form object-form close-deal-form">
      {existingProjects.length > 0 ? (
        <div className="alert-notice crm-deal-warning">
          <AlertCircle aria-hidden="true" />
          <div>
            <strong>Atenção: Já existe um Project associado a esta Organização</strong>
             <ul className="plain-list">
              {existingProjects.map((p) => (
               <li key={p.id}>
                   <Link href={`/projects/${p.id}`}>{p.name}</Link>
                   <span>{PROJECT_STATUS_LABELS[p.status]}</span>
                 </li>
              ))}
            </ul>
            <small>Podes avançar se este for um novo contrato ou aditamento independente.</small>
          </div>
        </div>
      ) : null}

      {state.message ? (
        <div className="alert-error" role="alert">
          <p>{state.message}</p>
        </div>
      ) : null}

      <div className="form-grid">
        <div className="field field-light field-full">
          <label htmlFor="company_name_display">Cliente (Organização)</label>
          <input
            id="company_name_display"
            type="text"
            readOnly
            disabled
            value={company.name}
            className="input-disabled"
          />
          <small>As relações e histórico desta Organização serão vinculados à entrega.</small>
        </div>

        <div className="field field-light field-full">
          <label htmlFor="project_name">Nome do Project *</label>
          <input
            id="project_name"
            name="name"
            type="text"
            required
            maxLength={160}
            defaultValue={`${company.name} — Entrega`}
            placeholder="Ex: Vouga — Redesenho de Produto"
          />
        </div>

        <div className="field field-light">
          <label htmlFor="owner_member_id">Responsável Vouga *</label>
          <select
            id="owner_member_id"
            name="owner_member_id"
            defaultValue={company.ownerMemberId}
            required
          >
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.displayName}
              </option>
            ))}
          </select>
        </div>

        <div className="field field-light">
          <label htmlFor="agreed_amount">Valor acordado (EUR) *</label>
          <input
            id="agreed_amount"
            name="agreed_amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            placeholder="Ex: 5000.00"
          />
        </div>

        <div className="field field-light">
          <label htmlFor="starts_on">Data de início *</label>
          <input
            id="starts_on"
            name="starts_on"
            type="date"
            required
            defaultValue={defaultStartsOn}
          />
        </div>

        <div className="field field-light">
          <label htmlFor="target_delivery_on">Entrega prevista *</label>
          <input
            id="target_delivery_on"
            name="target_delivery_on"
            type="date"
            required
            defaultValue={defaultTargetDeliveryOn}
          />
        </div>

        <div className="field field-light field-full">
          <label htmlFor="objective">Objetivo do Project *</label>
          <textarea
            id="objective"
            name="objective"
            rows={3}
            maxLength={800}
            required
            defaultValue={company.currentContext ?? ""}
            placeholder="Qual é a meta ou transformação que este projeto vai entregar?"
          />
        </div>

        <div className="field field-light field-full">
          <label htmlFor="expected_result">Resultado esperado *</label>
          <textarea
            id="expected_result"
            name="expected_result"
            rows={3}
            maxLength={800}
            required
            defaultValue="Entrega concluída de acordo com os requisitos aprovados."
            placeholder="Como saberemos de forma objetiva que a entrega foi concluída?"
          />
        </div>

        {contacts.length > 0 ? (
          <fieldset className="field field-light field-full crm-deal-contacts">
            <legend>Contactos do Cliente a associar ao Project</legend>
            <div className="crm-deal-contacts-list">
              {contacts.map((contact) => (
                <label key={contact.id} className="crm-checkbox-item">
                  <input
                    type="checkbox"
                    name="contact_ids"
                    value={contact.id}
                    checked={selectedContacts.has(contact.id)}
                    onChange={() => toggleContact(contact.id)}
                  />
                  <span>
                    <strong>{contact.displayName}</strong>
                    {contact.jobTitle ? <small> · {contact.jobTitle}</small> : null}
                  </span>
                </label>
              ))}
            </div>
            <small>Os contactos selecionados terão acesso ao contexto e comunicação do Project.</small>
          </fieldset>
        ) : null}

        {(needsCae || needsContact) ? (
          <div className="crm-deal-data-completion field-full">
            <div className="crm-deal-warning">
              <AlertCircle aria-hidden="true" />
              <div>
                <strong>Completar dados da Organização</strong>
                <small>
                  Para ativar a Organização e fechar contrato, é obrigatório indicar o CAE e pelo menos um contacto direto real (email ou telefone).
                </small>
              </div>
            </div>

            <div className="form-grid">
              <div className="field field-light">
                <label htmlFor="company_cae">CAE Principal *</label>
                <input
                  id="company_cae"
                  name="company_cae"
                  type="text"
                  required={needsCae}
                  defaultValue={company.primaryCae ?? ""}
                  placeholder="Ex: 62010"
                  maxLength={20}
                />
                <small>Código de Atividade Económica oficial.</small>
              </div>

              <div className="field field-light">
                <label htmlFor="company_email">Email de Contacto</label>
                <input
                  id="company_email"
                  name="company_email"
                  type="email"
                  defaultValue={company.contactEmail ?? ""}
                  placeholder="Ex: geral@empresa.pt"
                  maxLength={320}
                />
              </div>

              <div className="field field-light">
                <label htmlFor="company_phone">Telefone de Contacto</label>
                <input
                  id="company_phone"
                  name="company_phone"
                  type="tel"
                  defaultValue={company.contactPhone ?? ""}
                  placeholder="Ex: +351 912 345 678"
                  maxLength={40}
                />
                <small>Indica pelo menos um email ou telefone válido.</small>
              </div>

              <div className="field field-light">
                <label htmlFor="company_website">Website da Organização (opcional)</label>
                <input
                  id="company_website"
                  name="company_website"
                  type="text"
                  defaultValue={company.website ?? ""}
                  placeholder="Ex: https://empresa.pt"
                  maxLength={2048}
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="crm-deal-consequences">
        <p className="eyebrow">Consequências da Ação</p>
        <h3 className="section-title">O que acontece ao confirmar:</h3>
        <ul className="plain-list crm-consequence-list">
          <li>
            <strong>1. Criação do Project:</strong> O novo workspace de entrega será criado na área Work com as datas e o valor contratual acordado.
          </li>
          <li>
            <strong>2. Atualização da Organização:</strong> O estado passará a <em>Ativa</em> e a fase de prospeção avançará para <em>Acordado</em>.
          </li>
          <li>
            <label className="crm-checkbox-item">
              <input
                type="checkbox"
                name="log_interaction"
                value="yes"
                checked={logInteraction}
                onChange={(e) => setLogInteraction(e.target.checked)}
              />
              <span>
                <strong>3. Registar no histórico:</strong> Documentar o fecho do contrato e o valor acordado no timeline de interações da Organização.
              </span>
            </label>
            {logInteraction ? (
              <div className="field field-light crm-interaction-note-field">
                <label htmlFor="interaction_note">Nota adicional para o histórico (opcional)</label>
                <textarea
                  id="interaction_note"
                  name="interaction_note"
                  rows={2}
                  maxLength={500}
                  placeholder="Ex: Reunião final de aprovação e formalização do acordo com o cliente."
                />
              </div>
            ) : null}
          </li>
        </ul>
      </div>

      <div className="form-actions">
        <Link className="button-secondary" href={`/companies/${company.id}`}>
          Cancelar
        </Link>
        <button className="button-primary" type="submit" disabled={isPending}>
          {isPending ? "A criar Project…" : "Confirmar e Iniciar Project"}
        </button>
      </div>
    </form>
  );
}
