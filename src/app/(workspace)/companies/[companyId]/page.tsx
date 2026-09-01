import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Mail, Phone } from "lucide-react";
import { COMPANY_STATUS_LABELS, PROSPECTING_STAGE_LABELS } from "@/domain/companies/company";
import { CONTACT_CHANNEL_LABELS, initials } from "@/domain/relations/contact";
import { getAuthenticatedUser } from "@/application/auth/current-user";
import { createCompanyModule } from "@/foundation/composition/companies";
import { createContextEngine } from "@/foundation/composition/context-engine";
import { createRelationsModule } from "@/foundation/composition/relations";
import { safeWorkspaceReturnTo, withReturnTo } from "@/foundation/navigation/return-to";
import { ConfirmAction } from "@/foundation/ui/confirm-action";
import { ContextPanel } from "../../context-panel";
import { deleteCompanyAction } from "../actions";

const fullDate = new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium", timeStyle: "short" });

export default async function CompanyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { companyId } = await params;
  const query = await searchParams;
  const backHref = safeWorkspaceReturnTo(query.returnTo, "/relations?view=organizations");
  const backLabel = backHref.includes("view=organizations")
    ? "Organizações"
    : backHref.includes("segment=prospecting")
      ? "Prospeção"
      : "Contacts";
  const companyHref = query.returnTo
    ? withReturnTo(`/companies/${companyId}`, backHref)
    : `/companies/${companyId}`;
  const [companies, relations, contextEngine, user] = await Promise.all([
    createCompanyModule(),
    createRelationsModule(),
    createContextEngine(),
    getAuthenticatedUser(),
  ]);
  const [company, allContacts, context, history] = await Promise.all([
    companies.readModel.findById(companyId),
    relations.readModel.listContacts(),
    contextEngine.get(
      { type: "company", id: companyId },
      new Date().toISOString(),
      user?.role ?? "engineer",
    ),
    relations.readModel.listInteractionsByCompany(companyId),
  ]);
  if (!company) notFound();
  const contacts = allContacts.filter(
    (contact) => contact.status === "active" && contact.companyId === companyId,
  );

  return (
    <main className="workspace-main module-main crm-company-profile">
      <header className="crm-company-hero">
        <div>
          <Link className="back-link" href={backHref}>
            ← {backLabel}
          </Link>
          <h1 className="display">{company.name}</h1>
          <p>
            {COMPANY_STATUS_LABELS[company.status]}
            {company.prospectingStage
              ? ` · ${PROSPECTING_STAGE_LABELS[company.prospectingStage]}`
              : ""}
          </p>
        </div>
        <div className="detail-actions">
          <Link
            className="button-secondary"
            href={withReturnTo(`/relations/contacts/new?companyId=${company.id}`, companyHref)}
          >
            Novo perfil
          </Link>
          <Link className="button-secondary" href={`/companies/${company.id}/edit`}>
            Editar
          </Link>
        </div>
      </header>

      <section className="crm-company-overview">
        <div>
          <span>CAE principal</span>
          <strong>{company.primaryCae ?? "—"}</strong>
        </div>
        <div>
          <span>Contacto</span>
          {company.contactEmail ? (
            <a href={`mailto:${company.contactEmail}`}>{company.contactEmail}</a>
          ) : null}
          {company.contactPhone ? (
            <a href={`tel:${company.contactPhone}`}>{company.contactPhone}</a>
          ) : null}
          {!company.contactEmail && !company.contactPhone ? <strong>—</strong> : null}
        </div>
        <div>
          <span>Owner</span>
          <strong>{company.ownerDisplayName}</strong>
        </div>
      </section>

      <div className="crm-company-columns">
        <section className="crm-company-section">
          <header>
            <h2>Perfis</h2>
            <span>{contacts.length}</span>
          </header>
          <div className="crm-company-people">
            {contacts.length ? (
              contacts.map((contact) => (
                <Link
                  href={withReturnTo(`/relations/contacts/${contact.id}`, companyHref)}
                  key={contact.id}
                >
                  <span className="crm-contact-avatar">
                    {contact.avatarUrl ? (
                      <Image alt="" height={44} src={contact.avatarUrl} unoptimized width={44} />
                    ) : (
                      initials(contact.displayName)
                    )}
                  </span>
                  <span>
                    <strong>{contact.displayName}</strong>
                    <small>{contact.jobTitle ?? "Perfil"}</small>
                  </span>
                  {contact.email ? <Mail /> : contact.phone ? <Phone /> : <ArrowUpRight />}
                </Link>
              ))
            ) : (
              <p className="crm-muted">Ainda não existem pessoas associadas.</p>
            )}
          </div>
        </section>
        <section className="crm-company-section crm-company-notes">
          <header>
            <h2>Notas</h2>
          </header>
          <p>{company.currentContext ?? "Sem notas."}</p>
          {company.relationshipRisks ? <small>Risco · {company.relationshipRisks}</small> : null}
        </section>
      </div>

      <section className="crm-company-section">
        <header>
          <h2>Histórico de interações</h2>
          <span>{history.length}</span>
        </header>
        <div className="crm-company-history">
          {history.length ? (
            history.map((item) => {
              const content = (
                <>
                  <span>{CONTACT_CHANNEL_LABELS[item.channel]}</span>
                  <strong>{item.contactName ?? "Sem perfil específico"}</strong>
                  <p>{item.body}</p>
                  <time>{fullDate.format(new Date(item.occurredAt))}</time>
                </>
              );
              return item.contactId ? (
                <Link
                  href={withReturnTo(`/relations/contacts/${item.contactId}`, companyHref)}
                  key={item.id}
                >
                  {content}
                </Link>
              ) : (
                <article key={item.id}>{content}</article>
              );
            })
          ) : (
            <p className="crm-muted">Ainda não existem interações.</p>
          )}
        </div>
      </section>

      <ContextPanel context={context} collapsible />
      <div className="crm-company-danger">
        <ConfirmAction
          action={deleteCompanyAction.bind(null, company.id)}
          confirmation={`Eliminar ${company.name}? Só será possível se não existirem Perfis ou contexto operacional protegido.`}
          pendingLabel="A eliminar…"
        >
          Eliminar Organisation
        </ConfirmAction>
      </div>
    </main>
  );
}
