import Image from "next/image";
import Link from "next/link";
import { Building2, LayoutGrid, Linkedin, List, Plus } from "lucide-react";
import {
  PROSPECTING_STAGE_LABELS,
  PROSPECTING_STAGES,
  type ProspectingStage,
} from "@/domain/companies/company";
import { CONTACT_CHANNEL_LABELS, CONTACT_ROLE_LABELS, initials } from "@/domain/relations/contact";
import { createCompanyModule } from "@/foundation/composition/companies";
import { createRelationsModule } from "@/foundation/composition/relations";
import { withReturnTo } from "@/foundation/navigation/return-to";
import type { ContactPipelineRow } from "@/projections/relations/relations-read-model";
import { CopyScriptButton } from "./copy-script-button";
import { InteractionModal } from "./interaction-modal";
import {
  relationsHref,
  resolveRelationsLayout,
  resolveRelationsSegment,
  resolveRelationsView,
  type RelationsLayout,
  type RelationsSegment,
  type RelationsView,
} from "./relations-view";

const dateTime = new Intl.DateTimeFormat("pt-PT", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function LayoutSwitcher({
  layout,
  segment,
  view,
}: {
  layout: RelationsLayout;
  segment: RelationsSegment;
  view: RelationsView;
}) {
  return (
    <nav aria-label="Apresentação" className="crm-layout-switcher">
      <Link
        aria-current={layout === "list" ? "page" : undefined}
        aria-label="Ver como lista"
        className={layout === "list" ? "active" : ""}
        href={relationsHref({ layout: "list", segment, view })}
      >
        <List aria-hidden="true" />
        <span>Lista</span>
      </Link>
      <Link
        aria-current={layout === "grid" ? "page" : undefined}
        aria-label="Ver como quadrados"
        className={layout === "grid" ? "active" : ""}
        href={relationsHref({ layout: "grid", segment, view })}
      >
        <LayoutGrid aria-hidden="true" />
        <span>Quadrados</span>
      </Link>
    </nav>
  );
}

function PipelineIdentity({ row }: { row: ContactPipelineRow }) {
  return (
    <>
      <span className="crm-pipeline-avatar" aria-hidden="true">
        {row.primaryContactAvatarUrl ? (
          <Image alt="" height={38} src={row.primaryContactAvatarUrl} unoptimized width={38} />
        ) : (
          initials(row.primaryContactName ?? row.companyName)
        )}
      </span>
      <span className="crm-pipeline-identity">
        <strong>{row.companyName}</strong>
        <small>{row.primaryContactName ?? "Sem perfil principal"}</small>
      </span>
    </>
  );
}

function PipelineRow({ row, returnTo }: { row: ContactPipelineRow; returnTo: string }) {
  return (
    <Link className="crm-pipeline-row" href={withReturnTo(`/companies/${row.companyId}`, returnTo)}>
      <PipelineIdentity row={row} />
      <span className="crm-pipeline-message">
        {row.lastContact ? (
          <>
            <span>{row.lastContact.body}</span>
            <small>
              {CONTACT_CHANNEL_LABELS[row.lastContact.channel]} ·{" "}
              {dateTime.format(new Date(row.lastContact.occurredAt))}
            </small>
          </>
        ) : (
          <small>Sem interações</small>
        )}
      </span>
    </Link>
  );
}

function PipelineLists({
  rows,
  returnTo,
}: {
  rows: readonly ContactPipelineRow[];
  returnTo: string;
}) {
  return (
    <div className="crm-pipeline-lists">
      {PROSPECTING_STAGES.map((stage) => {
        const items = rows.filter((row) => row.stage === stage);
        return (
          <details
            className="crm-pipeline-list"
            data-stage={stage}
            key={stage}
            open={items.length > 0}
          >
            <summary>
              <span>{PROSPECTING_STAGE_LABELS[stage]}</span>
              <small>{items.length}</small>
            </summary>
            <div>
              {items.length > 0 ? (
                items.map((row) => (
                  <PipelineRow key={row.companyId} returnTo={returnTo} row={row} />
                ))
              ) : (
                <p>Sem contactos neste estado.</p>
              )}
            </div>
          </details>
        );
      })}
      {rows.length === 0 ? (
        <p className="crm-empty">Ainda não existem relações em prospeção.</p>
      ) : null}
    </div>
  );
}

function FollowUps({ rows, returnTo }: { rows: readonly ContactPipelineRow[]; returnTo: string }) {
  const groups: readonly {
    stage: ProspectingStage;
    title: string;
    empty: string;
  }[] = [
    {
      stage: "replied",
      title: "Por responder",
      empty: "Não há mensagens a responder.",
    },
    {
      stage: "contacted",
      title: "Contactados",
      empty: "Não há contactos efetuados.",
    },
  ];

  return (
    <section className="crm-followups">
      <header>
        <h2>Follow-ups</h2>
        <p>Conversas que pedem atenção agora.</p>
      </header>
      <div className="crm-followup-groups">
        {groups.map((group) => {
          const items = rows.filter((row) => row.stage === group.stage);
          return (
            <section className="crm-followup-group" data-stage={group.stage} key={group.stage}>
              <header>
                <h3>{group.title}</h3>
                <span className="crm-followup-count">{items.length}</span>
              </header>
              <div>
                {items.length ? (
                  items.map((row) => (
                    <PipelineRow key={row.companyId} returnTo={returnTo} row={row} />
                  ))
                ) : (
                  <p>{group.empty}</p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}

export default async function RelationsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; segment?: string; layout?: string }>;
}) {
  const query = await searchParams;
  const view = resolveRelationsView(query.view);
  const segment = resolveRelationsSegment(query.segment);
  const layout = resolveRelationsLayout(query.layout);
  const [{ readModel }, companyModule] = await Promise.all([
    createRelationsModule(),
    createCompanyModule(),
  ]);
  const [pipeline, contacts, templates, companies] = await Promise.all([
    readModel.listContactPipeline(),
    readModel.listContacts(),
    readModel.listTemplates(),
    companyModule.readModel.list(),
  ]);
  const activeContacts = contacts.filter((contact) => contact.status === "active");
  const interactionCompanies = pipeline.map((row) => ({
    id: row.companyId,
    name: row.companyName,
    profiles: row.contacts.map((contact) => ({
      id: contact.id,
      name: contact.displayName,
    })),
  }));
  const currentHref = relationsHref({ layout, segment, view });

  return (
    <main className={`workspace-main module-main relations-main crm-main crm-layout-${layout}`}>
      <header className="crm-page-heading">
        <h1 className="display">Contacts</h1>
      </header>

      <div className="crm-subnav">
        <nav aria-label="Contacts" className="crm-tabs">
          <Link
            className={view === "contacts" ? "active" : ""}
            href={relationsHref({ layout, segment, view: "contacts" })}
          >
            Contacts
          </Link>
          <Link
            className={view === "profiles" ? "active" : ""}
            href={relationsHref({ layout, segment, view: "profiles" })}
          >
            Perfis
          </Link>
          <Link
            className={view === "organizations" ? "active" : ""}
            href={relationsHref({ layout, segment, view: "organizations" })}
          >
            Organizações
          </Link>
          <Link
            className={view === "scripts" ? "active" : ""}
            href={relationsHref({ layout, segment, view: "scripts" })}
          >
            Guiões
          </Link>
        </nav>
        <div className="crm-subnav-actions">
          <LayoutSwitcher layout={layout} segment={segment} view={view} />
          <div className="crm-context-actions">
            {view === "contacts" && segment ? (
              <InteractionModal
                companies={interactionCompanies}
                returnTo={currentHref}
                templates={templates}
              />
            ) : view === "profiles" ? (
              <Link
                className="button-primary"
                href={withReturnTo("/relations/contacts/new", currentHref)}
              >
                <Plus aria-hidden="true" /> Perfil
              </Link>
            ) : view === "organizations" ? (
              <Link
                className="button-primary"
                href={withReturnTo("/companies/new?prospecting=1", currentHref)}
              >
                <Plus aria-hidden="true" /> Organização
              </Link>
            ) : view === "scripts" ? (
              <Link className="button-primary" href="/relations/messages/new">
                <Plus aria-hidden="true" /> Guião
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      {view === "contacts" ? (
        <section className="crm-contacts-workspace">
          <nav aria-label="Segmento" className="crm-segment-switcher">
            <Link
              className={!segment ? "active" : ""}
              href={relationsHref({ layout, segment: null, view: "contacts" })}
            >
              Follow-ups
            </Link>
            <Link
              className={segment === "prospecting" ? "active" : ""}
              href={relationsHref({ layout, segment: "prospecting", view: "contacts" })}
            >
              Prospeção
            </Link>
          </nav>
          {segment ? (
            <PipelineLists returnTo={currentHref} rows={pipeline} />
          ) : (
            <FollowUps returnTo={currentHref} rows={pipeline} />
          )}
        </section>
      ) : view === "organizations" ? (
        <section className="crm-directory">
          <div className="crm-directory-head">
            <span>{companies.length} organizações</span>
          </div>
          <div className="crm-table crm-organisation-table crm-layout-collection">
            {companies.map((company) => {
              const people = activeContacts.filter((contact) => contact.companyId === company.id);
              return (
                <Link
                  className="crm-organisation-row"
                  href={withReturnTo(`/companies/${company.id}`, currentHref)}
                  key={company.id}
                >
                  <span className="crm-icon">
                    <Building2 aria-hidden="true" />
                  </span>
                  <strong>{company.name}</strong>
                  <span className="crm-card-field" data-label="Perfis">
                    {people.length} {people.length === 1 ? "perfil" : "perfis"}
                  </span>
                  <span
                    className={`crm-card-field${
                      company.prospectingStage
                        ? ` crm-stage-badge crm-stage-${company.prospectingStage}`
                        : ""
                    }`}
                    data-label="Estado"
                  >
                    {company.prospectingStage
                      ? PROSPECTING_STAGE_LABELS[company.prospectingStage]
                      : "—"}
                  </span>
                  <span className="crm-card-field" data-label="Nota">
                    {company.currentContext ?? "Sem notas"}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ) : view === "profiles" ? (
        <section className="crm-directory">
          <div className="crm-directory-head">
            <span>{activeContacts.length} perfis</span>
          </div>
          <div className="crm-contact-list crm-layout-collection">
            {activeContacts.map((contact) => (
              <Link
                className="crm-contact-row"
                href={withReturnTo(`/relations/contacts/${contact.id}`, currentHref)}
                key={contact.id}
              >
                <span className="crm-contact-avatar">
                  {contact.avatarUrl ? (
                    <Image alt="" height={44} src={contact.avatarUrl} unoptimized width={44} />
                  ) : (
                    initials(contact.displayName)
                  )}
                </span>
                <span className="crm-cell-stack">
                  <strong>{contact.displayName}</strong>
                  <small>{contact.jobTitle ?? CONTACT_ROLE_LABELS[contact.relationshipRole]}</small>
                </span>
                <span className="crm-card-field" data-label="Organização">
                  {contact.companyName ?? "Independente"}
                </span>
                <span className="crm-card-field" data-label="Email">
                  {contact.email ?? "—"}
                </span>
                <span className="crm-card-field" data-label="Telefone">
                  {contact.phone ?? "—"}
                </span>
                <span className="crm-card-field" data-label="LinkedIn">
                  {contact.linkedinUrl ? <Linkedin aria-label="LinkedIn" /> : "—"}
                </span>
                <span className="crm-card-field" data-label="Nota">
                  {contact.importantContext ?? "—"}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <section className="crm-scripts crm-layout-collection">
          {templates.length === 0 ? (
            <div className="crm-empty">Ainda não existem guiões.</div>
          ) : (
            templates.map((script) => (
              <article className="crm-script-row" key={script.id}>
                <div>
                  <strong>{script.name}</strong>
                  <span>
                    {CONTACT_CHANNEL_LABELS[script.channel]} · {script.situation}
                  </span>
                </div>
                <p>{script.body}</p>
                <CopyScriptButton text={script.body} />
              </article>
            ))
          )}
        </section>
      )}
    </main>
  );
}
