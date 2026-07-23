import Link from "next/link";
import { notFound } from "next/navigation";

import {
  MEETING_KIND_LABELS,
  MEETING_STATUS_LABELS,
  type MeetingKind,
  type MeetingStatus,
} from "@/domain/meetings/meeting";
import { createContextEngine } from "@/foundation/composition/context-engine";
import { createMeetingModule } from "@/foundation/composition/meetings";
import {
  returnLabel,
  safeWorkspaceReturnTo,
  withReturnTo,
} from "@/foundation/navigation/return-to";
import { ConfirmAction } from "@/foundation/ui/confirm-action";
import { getAuthenticatedUser } from "@/application/auth/current-user";
import { ContextPanel } from "../../context-panel";

import { cancelMeetingAction, deleteMeetingAction } from "../actions";

export default async function MeetingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ meetingId: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { meetingId } = await params;
  const { returnTo } = await searchParams;
  const backHref = safeWorkspaceReturnTo(returnTo, "/meetings");
  const backLabel = returnLabel(backHref, "Meetings");
  const nowIso = new Date().toISOString();
  const [{ readModel }, contextEngine, user] = await Promise.all([
    createMeetingModule(),
    createContextEngine(),
    getAuthenticatedUser(),
  ]);
  const [meeting, context] = await Promise.all([
    readModel.findById(meetingId, nowIso),
    contextEngine.get({ type: "meeting", id: meetingId }, nowIso),
  ]);
  if (!meeting) notFound();
  const terminal = meeting.status === "closed" || meeting.status === "cancelled";
  const requiresOutput = meeting.kind === "meeting";
  const canClose = Boolean(user && meeting.participantMemberIds.includes(user.id));
  const cancelAction = cancelMeetingAction.bind(null, meeting.id);
  const objectLabel =
    meeting.kind === "vacation" ? "Vacation" : meeting.kind === "event" ? "Event" : "Meeting";

  return (
    <main className="workspace-main module-main object-view object-view-meeting">
      <Link className="back-link" href={backHref}>
        ← {backLabel}
      </Link>
      <div className="detail-heading object-hero">
        <div>
          <span className={`status-pill status-pill-${meeting.status}`}>
            {statusLabel(meeting.kind, meeting.status)}
          </span>
          <span className="status-pill">{MEETING_KIND_LABELS[meeting.kind]}</span>
          <h1 className="display">{meeting.title}</h1>
        </div>
        <div className="detail-actions">
          {!terminal && (
            <>
              <Link className="button-secondary" href={`/meetings/${meeting.id}/edit`}>
                Editar
              </Link>
              {requiresOutput && canClose ? (
                <Link
                  className="button-primary"
                  href={withReturnTo(`/meetings/${meeting.id}/close`, backHref)}
                >
                  Close meeting
                </Link>
              ) : null}
              <ConfirmAction
                action={cancelAction}
                confirmation={`Cancelar esta ${objectLabel}? O registo permanece consultável e não poderá voltar ao estado planeado.`}
                pendingLabel="A cancelar…"
              >
                Cancelar {objectLabel}
              </ConfirmAction>
            </>
          )}
          <ConfirmAction
            action={deleteMeetingAction.bind(null, meeting.id)}
            confirmation={`Eliminar definitivamente esta ${objectLabel}? Também será removida do Google e não ficará histórico no Vouga OS.`}
            pendingLabel="A eliminar…"
          >
            Eliminar
          </ConfirmAction>
        </div>
      </div>

      <div className="detail-grid meeting-detail-grid">
        <DetailCard className="meeting-time-card" label="Quando">
          <p>{formatInterval(meeting.startsAt, meeting.endsAt)}</p>
        </DetailCard>
        <DetailCard className="meeting-participants-card" label="Participantes" wide>
          {meeting.participants.length === 0 ? (
            <p className="muted-copy">Sem participantes registados.</p>
          ) : (
            <ul className="plain-list">
              {meeting.participants.map((participant, index) => (
                <li key={`${participant.kind}-${participant.displayName}-${index}`}>
                  {participant.displayName}
                  <span>{participant.kind === "internal" ? participant.email : "Externo"}</span>
                </li>
              ))}
            </ul>
          )}
        </DetailCard>
        {meeting.kind !== "vacation" ? (
          <>
            <DetailCard className="meeting-companies-card" label="Organisations">
              <Content value={meeting.companyNames.join("\n") || null} />
            </DetailCard>
            <DetailCard className="meeting-notes-card" label="Notas" wide>
              <Content value={meeting.notes} />
            </DetailCard>
            <DetailCard className="meeting-tasks-card" label="Tasks" wide>
              {meeting.tasks.length ? (
                <ul className="plain-list">
                  {meeting.tasks.map((task) => (
                    <li key={task.id}>
                      <Link href={`/tasks/${task.id}`}>{task.title}</Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted-copy">Sem Tasks relacionadas.</p>
              )}
            </DetailCard>
            {requiresOutput && (meeting.conclusion || meeting.status === "closed") && (
              <DetailCard className="meeting-conclusion-card" label="Conclusão" wide>
                <Content value={meeting.conclusion} />
              </DetailCard>
            )}
          </>
        ) : null}
      </div>
      {meeting.kind !== "vacation" ? (
        <>
          <ContextPanel context={context} />
          <div className="form-actions">
            <Link className="button-secondary" href={`/tasks/new?meeting=${meeting.id}`}>
              New task from this meeting
            </Link>
            <Link className="button-secondary" href={`/decisions/new?meeting=${meeting.id}`}>
              New decision from this meeting
            </Link>
          </div>
        </>
      ) : null}
    </main>
  );
}

function DetailCard({
  children,
  className = "",
  label,
  wide = false,
}: {
  children: React.ReactNode;
  className?: string;
  label: string;
  wide?: boolean;
}) {
  return (
    <section className={`detail-card${wide ? " detail-card-wide" : ""} ${className}`}>
      <p className="eyebrow">{label}</p>
      {children}
    </section>
  );
}
function Content({ value }: { value: string | null }) {
  return <p className={value ? undefined : "muted-copy"}>{value ?? "Não registado."}</p>;
}
function formatInterval(startsAt: string, endsAt: string) {
  const formatter = new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Europe/Lisbon",
  });
  return `${formatter.format(new Date(startsAt))} — ${formatter.format(new Date(endsAt))}`;
}

function statusLabel(kind: MeetingKind, status: MeetingStatus) {
  if (kind === "vacation" && status === "closed") return "Terminadas";
  if (kind === "vacation") return "Agendadas";
  if (kind === "event" && status === "closed") return "Terminado";
  return MEETING_STATUS_LABELS[status];
}
