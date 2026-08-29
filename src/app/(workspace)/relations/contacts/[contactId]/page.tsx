import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  CalendarDays,
  Linkedin,
  Mail,
  Phone,
} from "lucide-react";
import { ContextPanel } from "@/app/(workspace)/context-panel";
import { CONTACT_CHANNEL_LABELS, CONTACT_ROLE_LABELS, initials } from "@/domain/relations/contact";
import { getAuthenticatedUser } from "@/application/auth/current-user";
import { createContextEngine } from "@/foundation/composition/context-engine";
import { createRelationsModule } from "@/foundation/composition/relations";
import { safeWorkspaceReturnTo } from "@/foundation/navigation/return-to";
import { ConfirmAction } from "@/foundation/ui/confirm-action";
import { deleteContactAction } from "../../actions";

const dateTime = new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium", timeStyle: "short" });
const date = new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium" });

export default async function ContactPage({
  params,
  searchParams,
}: {
  params: Promise<{ contactId: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { contactId } = await params;
  const query = await searchParams;
  const backHref = safeWorkspaceReturnTo(query.returnTo, "/relations?view=profiles");
  const backLabel = backHref.startsWith("/companies/")
    ? "Organização"
    : backHref.includes("view=profiles")
      ? "Perfis"
      : backHref.includes("segment=prospecting")
        ? "Prospeção"
        : "Contacts";
  const { readModel } = await createRelationsModule();
  const [contact, contextEngine, user] = await Promise.all([
    readModel.findContact(contactId),
    createContextEngine(),
    getAuthenticatedUser(),
  ]);
  if (!contact) notFound();
  const context = await contextEngine.get(
    { type: "contact", id: contactId },
    new Date().toISOString(),
    user?.role ?? "engineer",
  );

  return (
    <main className="workspace-main module-main contact-profile crm-contact-profile">
      <header className="crm-contact-hero">
        <div className="contact-avatar">
          {contact.avatarUrl ? (
            <Image alt="" height={72} src={contact.avatarUrl} unoptimized width={72} />
          ) : (
            initials(contact.displayName)
          )}
        </div>
        <div>
          <Link className="back-link" href={backHref}>
            ← {backLabel}
          </Link>
          <h1 className="display">{contact.displayName}</h1>
          <p>
            {contact.jobTitle ?? CONTACT_ROLE_LABELS[contact.relationshipRole]}
            {contact.companyName ? ` · ${contact.companyName}` : ""}
          </p>
        </div>
        <Link className="button-secondary" href={`/relations/contacts/${contact.id}/edit`}>
          Editar
        </Link>
      </header>

      <section className="crm-contact-sheet" aria-label="Dados do perfil">
        <div>
          <span>Relação</span>
          <strong>{CONTACT_ROLE_LABELS[contact.relationshipRole]}</strong>
        </div>
        {contact.companyName ? (
          <div>
            <span>Organização</span>
            <Link href={`/companies/${contact.companyId}`}>
              <Building2 />
              {contact.companyName}
            </Link>
          </div>
        ) : null}
        {contact.email ? (
          <div>
            <span>Email</span>
            <a href={`mailto:${contact.email}`}>
              <Mail />
              {contact.email}
            </a>
          </div>
        ) : null}
        {contact.phone ? (
          <div>
            <span>Telefone</span>
            <a href={`tel:${contact.phone}`}>
              <Phone />
              {contact.phone}
            </a>
          </div>
        ) : null}
        {contact.linkedinUrl ? (
          <div>
            <span>LinkedIn</span>
            <a href={contact.linkedinUrl}>
              <Linkedin />
              Abrir perfil
            </a>
          </div>
        ) : null}
        <div>
          <span>Owner</span>
          <strong>{contact.ownerDisplayName}</strong>
        </div>
      </section>

      {contact.importantContext ? (
        <section className="crm-contact-note">
          <h2>Nota</h2>
          <p>{contact.importantContext}</p>
        </section>
      ) : null}

      <section className="crm-contact-section">
        <header>
          <h2>Histórico</h2>
          <span>{contact.interactions.length}</span>
        </header>
        {contact.interactions.length === 0 ? (
          <p className="crm-muted">Ainda não existem interações. O registo é feito em Contacts.</p>
        ) : (
          <div className="crm-contact-history">
            {contact.interactions.map((item) => (
              <article key={item.id}>
                <span className="interaction-icon">
                  {item.direction === "outbound" ? <ArrowUpRight /> : <ArrowDownLeft />}
                </span>
                <div>
                  <strong>{CONTACT_CHANNEL_LABELS[item.channel]}</strong>
                  <p>{item.body}</p>
                  <small>
                    {item.recorderName}
                    {item.hasReply ? " · com resposta" : ""}
                  </small>
                </div>
                <time>{dateTime.format(new Date(item.occurredAt))}</time>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="crm-contact-section">
        <header>
          <h2>Meetings e eventos</h2>
          <CalendarDays />
        </header>
        {contact.meetings.length === 0 ? (
          <p className="crm-muted">Sem Meetings associadas.</p>
        ) : (
          <div className="crm-contact-meetings">
            {contact.meetings.map((meeting) => (
              <Link href={`/meetings/${meeting.id}`} key={meeting.id}>
                <strong>{meeting.title}</strong>
                <time>{date.format(new Date(meeting.startsAt))}</time>
              </Link>
            ))}
          </div>
        )}
      </section>

      <ContextPanel context={context} collapsible />
      <div className="contact-archive">
        <ConfirmAction
          action={deleteContactAction.bind(null, contact.id)}
          confirmation={`Eliminar o Perfil de ${contact.displayName}? As interações ficam preservadas no histórico da Organização, sem ligação a este Perfil.`}
          pendingLabel="A eliminar…"
        >
          Eliminar Perfil
        </ConfirmAction>
      </div>
    </main>
  );
}
