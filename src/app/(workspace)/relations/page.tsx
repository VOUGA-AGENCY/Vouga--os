import Image from "next/image";
import Link from "next/link";
import { Building2, Linkedin, Plus } from "lucide-react";
import {
  PROSPECTING_STAGE_LABELS,
  PROSPECTING_STAGES,
  type ProspectingStage,
} from "@/domain/companies/company";
import {
  CONTACT_CHANNEL_LABELS,
  CONTACT_ROLE_LABELS,
  initials,
} from "@/domain/relations/contact";
import { createCompanyModule } from "@/foundation/composition/companies";
import { createRelationsModule } from "@/foundation/composition/relations";
import type {
  ContactPipelineRow,
  ContactSegment,
} from "@/projections/relations/relations-read-model";
import { CopyScriptButton } from "./copy-script-button";
import { InteractionModal } from "./interaction-modal";

type View = "contacts" | "profiles" | "organizations" | "scripts";

function resolvedView(value?: string): View {
  if (value === "profiles") return "profiles";
  if (value === "organizations") return "organizations";
  if (value === "messages" || value === "scripts") return "scripts";
  return "contacts";
}

function resolvedSegment(value?: string): ContactSegment | null {
  if (value === "prospecting" || value === "internal") return value;
  return null;
}

const dateTime = new Intl.DateTimeFormat("pt-PT", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function PipelineIdentity({ row }: { row: ContactPipelineRow }) {
  return (
    <>
      <span className="crm-pipeline-avatar" aria-hidden="true">
        {row.primaryContactAvatarUrl ? (
          <Image
            alt=""
            height={38}
            src={row.primaryContactAvatarUrl}
            unoptimized
            width={38}
          />
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

function PipelineRow({
  row,
  showSegment = false,
}: {
  row: ContactPipelineRow;
  showSegment?: boolean;
}) {
  return (
    <Link
      className="crm-pipeline-row"
      href={
        row.primaryContactId
          ? `/relations/contacts/${row.primaryContactId}`
          : `/companies/${row.companyId}`
      }
    >
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
      {showSegment ? (
        <span className="crm-segment-label">
          {row.segment === "prospecting" ? "Prospeção" : "Interno"}
        </span>
      ) : null}
    </Link>
  );
}

function PipelineLists({
  rows,
  segment,
}: {
  rows: readonly ContactPipelineRow[];
  segment: ContactSegment;
}) {
  return (
    <div className="crm-pipeline-lists">
      {PROSPECTING_STAGES.map((stage) => {
        const items = rows.filter((row) => row.stage === stage);
        return (
          <details className="crm-pipeline-list" key={stage} open={items.length > 0}>
            <summary>
              <span>{PROSPECTING_STAGE_LABELS[stage]}</span>
              <small>{items.length}</small>
            </summary>
            <div>
              {items.length > 0 ? (
                items.map((row) => <PipelineRow key={row.companyId} row={row} />)
              ) : (
                <p>Sem contactos neste estado.</p>
              )}
            </div>
          </details>
        );
      })}
      {rows.length === 0 ? (
        <p className="crm-empty">
          Ainda não existem relações em {segment === "prospecting" ? "prospeção" : "interno"}.
        </p>
      ) : null}
    </div>
  );
}

function FollowUps({ rows }: { rows: readonly ContactPipelineRow[] }) {
  const groups: readonly {
    stage: ProspectingStage;
    title: string;
    empty: string;
  }[] = [
    {
      stage: "replied",
      title: "A Responder",
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
            <section className="crm-followup-group" key={group.stage}>
              <header>
                <h3>{group.title}</h3>
                <span>{items.length}</span>
              </header>
              <div>
                {items.length ? (
                  items.map((row) => (
                    <PipelineRow key={row.companyId} row={row} showSegment />
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
  searchParams: Promise<{ view?: string; segment?: string }>;
}) {
  const query = await searchParams;
  const view = resolvedView(query.view);
  const segment = resolvedSegment(query.segment);
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
  const segmentRows = segment
    ? pipeline.filter((row) => row.segment === segment)
    : pipeline;
  const pairs = activeContacts.flatMap((contact) =>
    contact.companyId && contact.companyName
      ? [
          {
            companyId: contact.companyId,
            companyName: contact.companyName,
            contactId: contact.id,
            contactName: contact.displayName,
          },
        ]
      : [],
  );

  return (
    <main className="workspace-main module-main relations-main crm-main">
      <header className="crm-page-heading">
        <h1 className="display">Contacts</h1>
      </header>

      <div className="crm-subnav">
        <nav aria-label="Contacts" className="crm-tabs">
          <Link className={view === "contacts" ? "active" : ""} href="/relations">
            Contacts
          </Link>
          <Link
            className={view === "profiles" ? "active" : ""}
            href="/relations?view=profiles"
          >
            Perfis
          </Link>
          <Link
            className={view === "organizations" ? "active" : ""}
            href="/relations?view=organizations"
          >
            Organizações
          </Link>
          <Link
            className={view === "scripts" ? "active" : ""}
            href="/relations?view=scripts"
          >
            Guiões
          </Link>
        </nav>
        <div className="crm-context-actions">
          {view === "contacts" && segment ? (
            <InteractionModal pairs={pairs} segment={segment} templates={templates} />
          ) : view === "profiles" ? (
            <Link
              className="button-primary"
              href="/relations/contacts/new?returnTo=/relations?view=profiles"
            >
              <Plus aria-hidden="true" /> Perfil
            </Link>
          ) : view === "organizations" ? (
            <Link
              className="button-primary"
              href="/companies/new?returnTo=/relations?view=organizations"
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

      {view === "contacts" ? (
        <section className="crm-contacts-workspace">
          <nav aria-label="Segmento" className="crm-segment-switcher">
            <Link className={!segment ? "active" : ""} href="/relations">
              Follow-ups
            </Link>
            <Link
              className={segment === "prospecting" ? "active" : ""}
              href="/relations?segment=prospecting"
            >
              Prospeção
            </Link>
            <Link
              className={segment === "internal" ? "active" : ""}
              href="/relations?segment=internal"
            >
              Interno
            </Link>
          </nav>
          {segment ? <PipelineLists rows={segmentRows} segment={segment} /> : <FollowUps rows={pipeline} />}
        </section>
      ) : view === "organizations" ? (
        <section className="crm-directory">
          <div className="crm-directory-head">
            <span>{companies.length} organizações</span>
          </div>
          <div className="crm-table crm-organisation-table">
            {companies.map((company) => {
              const people = activeContacts.filter(
                (contact) => contact.companyId === company.id,
              );
              return (
                <Link
                  className="crm-organisation-row"
                  href={`/companies/${company.id}`}
                  key={company.id}
                >
                  <span className="crm-icon">
                    <Building2 aria-hidden="true" />
                  </span>
                  <strong>{company.name}</strong>
                  <span>
                    {people.length} {people.length === 1 ? "perfil" : "perfis"}
                  </span>
                  <span>
                    {company.prospectingStage
                      ? PROSPECTING_STAGE_LABELS[company.prospectingStage]
                      : "—"}
                  </span>
                  <span>{company.currentContext ?? "Sem notas"}</span>
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
          <div className="crm-contact-list">
            {activeContacts.map((contact) => (
              <Link
                className="crm-contact-row"
                href={`/relations/contacts/${contact.id}`}
                key={contact.id}
              >
                <span className="crm-contact-avatar">
                  {contact.avatarUrl ? (
                    <Image
                      alt=""
                      height={44}
                      src={contact.avatarUrl}
                      unoptimized
                      width={44}
                    />
                  ) : (
                    initials(contact.displayName)
                  )}
                </span>
                <span className="crm-cell-stack">
                  <strong>{contact.displayName}</strong>
                  <small>
                    {contact.jobTitle ?? CONTACT_ROLE_LABELS[contact.relationshipRole]}
                  </small>
                </span>
                <span>{contact.companyName ?? "Independente"}</span>
                <span>{contact.email ?? "—"}</span>
                <span>{contact.phone ?? "—"}</span>
                <span>
                  {contact.linkedinUrl ? (
                    <Linkedin aria-label="LinkedIn" />
                  ) : (
                    "—"
                  )}
                </span>
                <span>{contact.importantContext ?? "—"}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <section className="crm-scripts">
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
