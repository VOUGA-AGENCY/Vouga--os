import Link from "next/link";
import { notFound } from "next/navigation";

import { getAuthenticatedUser } from "@/application/auth/current-user";
import { GoogleEventArtifactNotFoundError } from "@/application/google/google-event-artifact-service";
import { createGoogleIntegrationModule } from "@/foundation/composition/google";
import { safeWorkspaceReturnTo } from "@/foundation/navigation/return-to";

import { GoogleEventArtifactForm } from "./google-event-artifact-form";
import { ConfirmAction } from "@/foundation/ui/confirm-action";
import { deleteGoogleEventAction } from "./actions";

export default async function GoogleEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ calendar?: string; returnTo?: string }>;
}) {
  const [{ eventId }, query, user] = await Promise.all([
    params,
    searchParams,
    getAuthenticatedUser(),
  ]);
  if (!user || !query.calendar) notFound();
  const returnTo = safeWorkspaceReturnTo(query.returnTo, "/calendar");
  let detail;
  try {
    detail = await (
      await createGoogleIntegrationModule()
    ).eventArtifactService.getDetail(user.id, query.calendar, eventId);
  } catch (error) {
    if (error instanceof GoogleEventArtifactNotFoundError) notFound();
    throw error;
  }
  const nowIso = new Date().toISOString();
  const missingOutput =
    detail.artifact?.classification === "meeting" &&
    detail.event.end < nowIso &&
    !detail.artifact.output;

  return (
    <main className="workspace-main module-main google-event-detail">
      <div className="detail-heading">
        <div>
          <Link className="back-link" href={returnTo}>
            ← Calendar
          </Link>
          <p className="eyebrow">Google Calendar</p>
          <h1 className="display">{detail.event.title}</h1>
        </div>
        <div className="detail-actions">
          <a
            className="button-secondary"
            href={detail.event.htmlLink}
            rel="noreferrer"
            target="_blank"
          >
            Open in Google
          </a>
          <ConfirmAction
            action={deleteGoogleEventAction.bind(null, query.calendar, eventId, returnTo)}
            confirmation="Eliminar definitivamente este evento? Será removido do Google e não ficará histórico no Vouga OS."
            pendingLabel="A eliminar…"
          >
            Eliminar
          </ConfirmAction>
        </div>
      </div>
      <dl className="google-event-official-data">
        <div>
          <dt>Quando</dt>
          <dd>{formatInterval(detail.event.start, detail.event.end, detail.event.allDay)}</dd>
        </div>
        {detail.event.location ? (
          <div>
            <dt>Onde</dt>
            <dd>{detail.event.location}</dd>
          </div>
        ) : null}
        <div>
          <dt>Fonte</dt>
          <dd>Google Calendar</dd>
        </div>
        {missingOutput ? (
          <div className="google-event-missing-output">
            <dt>Estado</dt>
            <dd>Meeting sem output</dd>
          </div>
        ) : null}
      </dl>
      {detail.event.description ? (
        <section className="google-event-description">
          <h2 className="section-title">Descrição</h2>
          <p>{detail.event.description}</p>
        </section>
      ) : null}
      <section className="google-event-local-context">
        <h2 className="section-title">Contexto no OS</h2>
        <GoogleEventArtifactForm
          artifact={detail.artifact}
          calendarId={query.calendar}
          companies={detail.companies}
          defaultMemberId={user.id}
          eventId={eventId}
          members={detail.members}
          returnTo={returnTo}
          tasks={detail.tasks}
        />
      </section>
    </main>
  );
}

function formatInterval(start: string, end: string, allDay: boolean) {
  if (allDay) return start === end ? start : `${start} — ${end}`;
  const formatter = new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Lisbon",
  });
  return `${formatter.format(new Date(start))} — ${formatter.format(new Date(end))}`;
}
