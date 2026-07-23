"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import type { MeetingFormOptions } from "@/application/meetings/contracts";
import { VACATION_TONES, type MeetingKind, type VacationTone } from "@/domain/meetings/meeting";
import {
  FormFeedback,
  FormFields,
  FormSubmit,
  RequiredFieldsNote,
} from "@/foundation/ui/form-controls";
import {
  addDays,
  dateKeyInLisbon,
  lisbonLocalTimeToIso,
} from "@/projections/calendar/calendar-time";
import type { MeetingDetail } from "@/projections/meetings/meeting-read-model";
import type { MeetingFormState } from "./actions";
type Action = (state: MeetingFormState, data: FormData) => Promise<MeetingFormState>;
const initial = { message: null };
function local(iso: string) {
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
function iso(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}
export function MeetingForm({
  action,
  defaults,
  meeting,
  options,
  returnTo,
}: {
  action: Action;
  defaults: { startsAt: string; endsAt: string; participantMemberId?: string };
  meeting?: MeetingDetail;
  options: MeetingFormOptions;
  returnTo?: string;
}) {
  const [state, formAction] = useActionState(action, initial);
  const initialStartsAt = meeting?.startsAt ?? defaults.startsAt;
  const initialEndsAt = meeting?.endsAt ?? defaults.endsAt;
  const [kind, setKind] = useState<MeetingKind>(meeting?.kind ?? "meeting");
  const [start, setStart] = useState(local(initialStartsAt));
  const [end, setEnd] = useState(local(initialEndsAt));
  const [vacationStart, setVacationStart] = useState(dateKeyInLisbon(initialStartsAt));
  const [vacationEnd, setVacationEnd] = useState(
    meeting?.kind === "vacation"
      ? dateKeyInLisbon(new Date(Date.parse(initialEndsAt) - 1).toISOString())
      : dateKeyInLisbon(initialStartsAt),
  );
  const members = new Set(
    meeting?.participantMemberIds ??
      (defaults.participantMemberId ? [defaults.participantMemberId] : []),
  );
  const companies = new Set(meeting?.companyIds ?? []);
  const tasks = new Set(meeting?.taskIds ?? []);
  const vacationStartsAt = lisbonLocalTimeToIso(vacationStart, 0, 0);
  const vacationEndsAt = lisbonLocalTimeToIso(addDays(vacationEnd, 1), 0, 0);
  return (
    <form action={formAction} className="company-form meeting-form object-form object-form-meeting">
      <input
        name="starts_at"
        type="hidden"
        value={kind === "vacation" ? vacationStartsAt : iso(start)}
      />
      <input name="ends_at" type="hidden" value={kind === "vacation" ? vacationEndsAt : iso(end)} />
      {returnTo ? <input name="return_to" type="hidden" value={returnTo} /> : null}
      {kind === "vacation" ? null : <RequiredFieldsNote />}
      <FormFields>
        <div className="company-form-grid object-form-grid">
          <fieldset className="choice-field company-form-wide">
            <legend>Tipo</legend>
            <div className="choice-grid choice-grid-three">
              <label className="choice-option">
                <input
                  checked={kind === "meeting"}
                  name="kind"
                  onChange={() => setKind("meeting")}
                  type="radio"
                  value="meeting"
                />
                <span>
                  Meeting<small>Precisa de output depois.</small>
                </span>
              </label>
              <label className="choice-option">
                <input
                  checked={kind === "event"}
                  name="kind"
                  onChange={() => setKind("event")}
                  type="radio"
                  value="event"
                />
                <span>
                  Event<small>Termina quando passa a hora.</small>
                </span>
              </label>
              <label className="choice-option">
                <input
                  checked={kind === "vacation"}
                  name="kind"
                  onChange={() => setKind("vacation")}
                  type="radio"
                  value="vacation"
                />
                <span>
                  Vacation<small>Aparece como bloco de dia inteiro.</small>
                </span>
              </label>
            </div>
          </fieldset>
          {kind === "vacation" ? (
            <>
              <fieldset className="choice-field company-form-wide">
                <legend>Pessoa</legend>
                <div className="choice-grid">
                  {options.members.map((member) => (
                    <label className="choice-option" key={member.id}>
                      <input
                        defaultChecked={members.has(member.id)}
                        name="participant_member_id"
                        required
                        type="radio"
                        value={member.id}
                      />
                      <span>{member.displayName}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="field field-light">
                <label htmlFor="vacation_start">Início</label>
                <input
                  id="vacation_start"
                  max={vacationEnd}
                  onChange={(event) => {
                    setVacationStart(event.target.value);
                    if (event.target.value > vacationEnd) setVacationEnd(event.target.value);
                  }}
                  required
                  type="date"
                  value={vacationStart}
                />
              </div>
              <div className="field field-light">
                <label htmlFor="vacation_end">Fim</label>
                <input
                  id="vacation_end"
                  min={vacationStart}
                  onChange={(event) => setVacationEnd(event.target.value)}
                  required
                  type="date"
                  value={vacationEnd}
                />
              </div>
              <fieldset className="choice-field company-form-wide">
                <legend>Cor</legend>
                <div className="vacation-tone-grid">
                  {VACATION_TONES.map((tone) => (
                    <label className={`vacation-tone vacation-tone-${tone}`} key={tone}>
                      <input
                        defaultChecked={(meeting?.calendarTone ?? "orange") === tone}
                        name="calendar_tone"
                        required
                        type="radio"
                        value={tone}
                      />
                      <span>{VACATION_TONE_LABELS[tone]}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </>
          ) : (
            <>
              <div className="field field-light company-form-wide">
                <label htmlFor="title">Título</label>
                <input
                  defaultValue={meeting?.title}
                  id="title"
                  maxLength={160}
                  name="title"
                  required
                />
              </div>
              <div className="field field-light">
                <label htmlFor="starts_at_local">Início</label>
                <input
                  id="starts_at_local"
                  onChange={(event) => setStart(event.target.value)}
                  required
                  type="datetime-local"
                  value={start}
                />
              </div>
              <div className="field field-light">
                <label htmlFor="ends_at_local">Fim</label>
                <input
                  id="ends_at_local"
                  onChange={(event) => setEnd(event.target.value)}
                  required
                  type="datetime-local"
                  value={end}
                />
              </div>
            </>
          )}
          {kind === "vacation" ? null : (
            <fieldset className="choice-field company-form-wide">
              <legend>Participantes</legend>
              <div className="choice-grid">
                {options.members.map((member) => (
                  <label className="choice-option" key={member.id}>
                    <input
                      defaultChecked={members.has(member.id)}
                      name="participant_member_id"
                      type="checkbox"
                      value={member.id}
                    />
                    <span>
                      {member.displayName}
                      <small>{member.email}</small>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          {kind === "vacation" ? null : (
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
          )}
          {kind === "vacation" ? null : (
            <fieldset className="choice-field company-form-wide">
              <legend>Tasks relacionadas</legend>
              {options.tasks.length ? (
                <div className="choice-grid">
                  {options.tasks.map((task) => (
                    <label className="choice-option" key={task.id}>
                      <input
                        defaultChecked={tasks.has(task.id)}
                        name="task_id"
                        type="checkbox"
                        value={task.id}
                      />
                      <span>{task.title}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="field-help">Sem Tasks.</p>
              )}
              {meeting ? (
                <Link
                  className="button-secondary inline-form-link"
                  href={`/tasks/new?meeting=${meeting.id}&returnTo=${encodeURIComponent(`/meetings/${meeting.id}`)}`}
                >
                  New task
                </Link>
              ) : (
                <p className="field-help">
                  Guarda primeiro para poderes criar uma Task com esta origem.
                </p>
              )}
            </fieldset>
          )}
          {kind === "vacation" ? null : (
            <div className="field field-light company-form-wide">
              <label htmlFor="notes">Notas</label>
              <textarea
                defaultValue={meeting?.notes ?? ""}
                id="notes"
                maxLength={12000}
                name="notes"
                rows={6}
              />
            </div>
          )}
        </div>
      </FormFields>
      <FormFeedback message={state.message} />
      <div className="form-actions">
        <FormSubmit idleLabel={meeting ? "Save changes" : "Save"} />
        <Link
          className="button-secondary"
          href={meeting ? `/meetings/${meeting.id}` : (returnTo ?? "/calendar")}
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}

const VACATION_TONE_LABELS: Record<VacationTone, string> = {
  orange: "Laranja",
  blue: "Azul",
  green: "Verde",
  purple: "Roxo",
  pink: "Rosa",
  red: "Vermelho",
};
