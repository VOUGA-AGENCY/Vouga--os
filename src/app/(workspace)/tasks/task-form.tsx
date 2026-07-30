"use client";
import Link from "next/link";
import { useActionState } from "react";
import type { TaskFormOptions } from "@/application/tasks/contracts";
import {
  FormFeedback,
  FormFields,
  FormSubmit,
  RequiredFieldsNote,
} from "@/foundation/ui/form-controls";
import type { TaskDetail } from "@/projections/tasks/task-read-model";
import { isoToLisbonLocalDateTime } from "@/projections/calendar/calendar-time";
import type { TaskFormState } from "./actions";
type Action = (state: TaskFormState, data: FormData) => Promise<TaskFormState>;
function payload(task: TaskDetail) {
  const origin = task.origin;
  if (origin.type === "meeting") return `meeting:${origin.meetingId}`;
  if (origin.type === "google_event")
    return `google:${encodeURIComponent(origin.googleEvent.memberId)}:${encodeURIComponent(origin.googleEvent.calendarId)}:${encodeURIComponent(origin.googleEvent.eventId)}`;
  if (origin.type === "decision") return `legacy-decision:${origin.decisionId}`;
  if (origin.type === "direct") return `legacy-direct:${encodeURIComponent(origin.directReason)}`;
  return "planning";
}
export function TaskForm({
  action,
  options,
  task,
  defaultMeetingId,
  defaultGoogleEvent,
  returnTo,
}: {
  action: Action;
  options: TaskFormOptions;
  task?: TaskDetail;
  defaultMeetingId?: string;
  defaultGoogleEvent?: TaskFormOptions["googleEvents"][number];
  returnTo?: string;
}) {
  const [state, formAction] = useActionState(action, { message: null });
  const companies = new Set(task?.companyIds ?? []);
  const google = defaultGoogleEvent
    ? `google:${encodeURIComponent(defaultGoogleEvent.memberId)}:${encodeURIComponent(defaultGoogleEvent.calendarId)}:${encodeURIComponent(defaultGoogleEvent.eventId)}`
    : null;
  const origin = task
    ? payload(task)
    : defaultMeetingId
      ? `meeting:${defaultMeetingId}`
      : (google ?? "planning");
  return (
    <form action={formAction} className="company-form object-form object-form-task">
      {returnTo ? <input name="return_to" type="hidden" value={returnTo} /> : null}
      <RequiredFieldsNote />
      <FormFields>
        <div className="company-form-grid object-form-grid">
          <div className="field field-light company-form-wide">
            <label htmlFor="title">Título</label>
            <input defaultValue={task?.title} id="title" maxLength={160} name="title" required />
          </div>
          <div className="field field-light">
            <label htmlFor="owner_member_id">Owner</label>
            <select
              defaultValue={task?.ownerMemberId ?? options.members[0]?.id}
              id="owner_member_id"
              name="owner_member_id"
              required
            >
              {options.members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.displayName}
                </option>
              ))}
            </select>
          </div>
          <div className="field field-light">
            <label htmlFor="due_at">Data limite</label>
            <input
              defaultValue={task?.dueAt ? isoToLisbonLocalDateTime(task.dueAt) : ""}
              id="due_at"
              name="due_at"
              type="datetime-local"
            />
          </div>
          <div className="field field-light company-form-wide">
            <label htmlFor="origin_payload">Origem</label>
            {task ? (
              <>
                <input name="origin_payload" type="hidden" value={origin} />
                <p className="field-help">{task.originLabel}</p>
              </>
            ) : (
              <select defaultValue={origin} id="origin_payload" name="origin_payload">
                <option value="planning">Planeamento</option>
                {options.meetings.map((item) => (
                  <option key={item.id} value={`meeting:${item.id}`}>
                    {item.kind === "event" ? "Event" : "Meeting"} · {item.title} ·{" "}
                    {new Intl.DateTimeFormat("pt-PT", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(item.startsAt))}
                  </option>
                ))}
                {options.googleEvents.map((item) => (
                  <option
                    key={`${item.calendarId}:${item.eventId}`}
                    value={`google:${encodeURIComponent(item.memberId)}:${encodeURIComponent(item.calendarId)}:${encodeURIComponent(item.eventId)}`}
                  >
                    Google · {item.title} ·{" "}
                    {new Intl.DateTimeFormat("pt-PT", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(item.startsAt))}
                  </option>
                ))}
              </select>
            )}
          </div>
          <fieldset className="choice-field company-form-wide">
            <legend>Organisations relacionadas</legend>
            {options.companies.length ? (
              <div className="choice-grid">
                {options.companies.map((company) => (
                  <label className="choice-option" key={company.id}>
                    <input
                      defaultChecked={companies.has(company.id)}
                      name="company_id"
                      type="checkbox"
                      value={company.id}
                    />
                    <span>
                      {company.name}
                      {company.archived ? <small>Arquivada</small> : null}
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="field-help">Sem Organisations.</p>
            )}
          </fieldset>
          {task?.meetingIds.map((id) => (
            <input key={id} name="meeting_id" type="hidden" value={id} />
          ))}
        </div>
      </FormFields>
      <FormFeedback message={state.message} />
      <div className="form-actions">
        <FormSubmit idleLabel={task ? "Save changes" : "Save task"} />
        <Link
          className="button-secondary"
          href={task ? `/tasks/${task.id}` : (returnTo ?? "/tasks")}
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
