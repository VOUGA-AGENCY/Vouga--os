"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useState, type ChangeEvent } from "react";
import type { ActiveMember } from "@/application/members/contracts";
import type { RelationCompanyOption } from "@/application/relations/contracts";
import { CONTACT_ROLE_LABELS, CONTACT_ROLES, initials } from "@/domain/relations/contact";
import { FormFeedback, FormFields, FormSubmit } from "@/foundation/ui/form-controls";
import type { ContactDetail } from "@/projections/relations/relations-read-model";
import type { RelationsFormState } from "./actions";

const MAX_AVATAR_DATA_URL_LENGTH = 350_000;
const AVATAR_SIZE = 420;

async function fileToAvatarDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Escolhe uma imagem.");
  const source = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = document.createElement("img");
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Não foi possível ler a imagem."));
      img.src = source;
    });
    const ratio = Math.min(AVATAR_SIZE / image.width, AVATAR_SIZE / image.height, 1);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * ratio));
    canvas.height = Math.max(1, Math.round(image.height * ratio));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Não foi possível preparar a imagem.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.78);
    if (dataUrl.length > MAX_AVATAR_DATA_URL_LENGTH) throw new Error("A imagem é demasiado pesada. Usa uma fotografia mais leve.");
    return dataUrl;
  } finally { URL.revokeObjectURL(source); }
}

export function ContactForm({ action, contact, members, companies, defaultOwnerId, defaultCompanyId, prospectingContext = false, returnTo }: {
  action: (state: RelationsFormState, data: FormData) => Promise<RelationsFormState>;
  contact?: ContactDetail;
  members: readonly ActiveMember[];
  companies: readonly RelationCompanyOption[];
  defaultOwnerId?: string;
  defaultCompanyId?: string;
  prospectingContext?: boolean;
  returnTo?: string;
}) {
  const [state, formAction] = useActionState(action, { message: null });
  const [avatarUrl, setAvatarUrl] = useState(contact?.avatarUrl ?? "");
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [newOrganisationName, setNewOrganisationName] = useState("");
  const cancelHref = returnTo?.startsWith("/") ? returnTo : contact ? `/relations/contacts/${contact.id}` : "/relations?view=profiles";

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatarError(null);
    try { setAvatarUrl(await fileToAvatarDataUrl(file)); }
    catch (error) {
      setAvatarError(error instanceof Error ? error.message : "Não foi possível importar a foto.");
      event.target.value = "";
    }
  }

  return <form action={formAction} className="crm-editor crm-contact-editor">
    <input name="prospecting_context" type="hidden" value={prospectingContext ? "1" : "0"} />
    <input name="set_as_primary" type="hidden" value={prospectingContext ? "1" : "0"} />
    <input name="return_to" type="hidden" value={returnTo ?? ""} />
    <FormFields>
      <section className="crm-editor-group crm-editor-identity">
        <div className="crm-avatar-field">
          <input id="avatar_url" name="avatar_url" readOnly type="hidden" value={avatarUrl} />
          <div className="avatar-import-preview" aria-hidden="true">{avatarUrl ? <Image alt="" height={80} src={avatarUrl} unoptimized width={80} /> : initials(contact?.displayName ?? "Perfil")}</div>
          <div><label className="crm-file-button" htmlFor="avatar_file">Escolher fotografia</label><input accept="image/jpeg,image/png,image/webp" className="sr-only" id="avatar_file" onChange={handleAvatarChange} type="file" />{avatarUrl ? <button className="crm-text-button" onClick={() => { setAvatarUrl(""); setAvatarError(null); }} type="button">Remover</button> : null}</div>
          {avatarError ? <p className="field-hint field-error">{avatarError}</p> : null}
        </div>
        <div className="crm-editor-grid">
          <div className="field field-light crm-span-2"><label htmlFor="display_name">Nome</label><input autoFocus defaultValue={contact?.displayName} id="display_name" maxLength={160} name="display_name" placeholder="Nome completo" required /></div>
          <div className="field field-light"><label htmlFor="job_title">Cargo</label><input defaultValue={contact?.jobTitle ?? ""} id="job_title" maxLength={160} name="job_title" placeholder="Gerente" /></div>
          <div className="field field-light"><label htmlFor="relationship_role">Relação</label><select defaultValue={contact?.relationshipRole ?? "prospect"} id="relationship_role" name="relationship_role">{CONTACT_ROLES.map((role) => <option key={role} value={role}>{CONTACT_ROLE_LABELS[role]}</option>)}</select></div>
        </div>
      </section>

      <section className="crm-editor-group">
        <header><h2>Organização</h2></header>
        <div className="crm-editor-grid">
          <div className="field field-light"><label htmlFor="company_id">Organização existente</label><select defaultValue={contact?.companyId ?? defaultCompanyId ?? ""} disabled={Boolean(newOrganisationName.trim())} id="company_id" name="company_id"><option value="">Independente</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></div>
          <div className="field field-light"><label htmlFor="new_company_name">Ou criar nova</label><input id="new_company_name" maxLength={160} name="new_company_name" onChange={(event) => setNewOrganisationName(event.target.value)} placeholder="Nome da organização" /></div>
          <div className="field field-light crm-span-2"><label htmlFor="owner_member_id">Owner no Vouga OS</label><select defaultValue={contact?.ownerMemberId ?? defaultOwnerId ?? members[0]?.id} id="owner_member_id" name="owner_member_id" required>{members.map((member) => <option key={member.id} value={member.id}>{member.displayName}</option>)}</select></div>
        </div>
      </section>

      <section className="crm-editor-group">
        <header><h2>Contacto</h2></header>
        <div className="crm-editor-grid crm-editor-grid-3">
          <div className="field field-light"><label htmlFor="email">Email</label><input defaultValue={contact?.email ?? ""} id="email" name="email" type="email" placeholder="nome@empresa.pt" /></div>
          <div className="field field-light"><label htmlFor="phone">Telefone</label><input defaultValue={contact?.phone ?? ""} id="phone" name="phone" placeholder="+351" /></div>
          <div className="field field-light"><label htmlFor="linkedin_url">LinkedIn</label><input defaultValue={contact?.linkedinUrl ?? ""} id="linkedin_url" name="linkedin_url" placeholder="https://linkedin.com/in/..." type="url" /></div>
        </div>
      </section>

      <section className="crm-editor-group">
        <header><h2>Nota</h2></header>
        <div className="field field-light"><textarea defaultValue={contact?.importantContext ?? ""} id="important_context" maxLength={6000} name="important_context" placeholder="Contexto que vale a pena preservar." rows={4} /></div>
      </section>
    </FormFields>
    <FormFeedback message={state.message} />
    <div className="crm-editor-actions"><Link className="button-secondary" href={cancelHref}>Cancelar</Link><FormSubmit idleLabel={contact ? "Guardar alterações" : "Criar perfil"} /></div>
  </form>;
}
