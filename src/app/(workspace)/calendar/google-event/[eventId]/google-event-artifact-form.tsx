"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import type { ActiveMember } from "@/application/members/contracts";
import type { CompanyOption, MeetingTaskOption } from "@/application/meetings/contracts";
import type { GoogleEventArtifact } from "@/domain/google/google-event-artifact";
import { FormFeedback, FormFields, FormSubmit } from "@/foundation/ui/form-controls";
import { saveGoogleEventArtifactAction, type GoogleEventArtifactFormState } from "./actions";
const initial: GoogleEventArtifactFormState = { message: null };
export function GoogleEventArtifactForm({
  artifact,
  calendarId,
  companies,
  defaultMemberId,
  eventId,
  members,
  returnTo,
  tasks,
}: {
  artifact: GoogleEventArtifact | null;
  calendarId: string;
  companies: readonly CompanyOption[];
  defaultMemberId: string;
  eventId: string;
  members: readonly ActiveMember[];
  returnTo: string;
  tasks: readonly MeetingTaskOption[];
}) {
  const [state, action] = useActionState(saveGoogleEventArtifactAction, initial);
  const [classification, setClassification] = useState(artifact?.classification ?? "");
  const selectedMembers = new Set(artifact?.participantMemberIds ?? [defaultMemberId]);
  const selectedCompanies = new Set(artifact?.companyIds ?? []);
  const selectedTasks = new Set(artifact?.taskIds ?? []);
  return (
    <form action={action} className="company-form object-form google-event-artifact-form">
      <input name="calendar_id" type="hidden" value={calendarId} />
      <input name="event_id" type="hidden" value={eventId} />
      <input name="return_to" type="hidden" value={returnTo} />
      <FormFields>
        <div className="company-form-grid object-form-grid">
          <fieldset className="choice-field company-form-wide">
            <legend>Tipo de registo</legend>
            <div className="choice-grid choice-grid-three">
              {[
                ["", "Google Event"],
                ["meeting", "Meeting"],
                ["event", "Event"],
              ].map(([value, label]) => (
                <label className="choice-option" key={label}>
                  <input
                    checked={classification === value}
                    name="classification"
                    onChange={() => setClassification(value)}
                    type="radio"
                    value={value}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <details className="crm-editor-more company-form-wide" open={Boolean(artifact?.companyIds.length || artifact?.taskIds.length)}>
            <summary>Associar Participantes, Organisations e Tasks</summary>
            <div className="crm-editor-grid" style={{ marginTop: "var(--space-4)" }}>
              <fieldset className="choice-field company-form-wide">
                <legend>Participantes</legend>
                <div className="choice-grid">
                  {members.map((member) => (
                    <label className="choice-option" key={member.id}>
                      <input
                        defaultChecked={selectedMembers.has(member.id)}
                        name="participant_member_id"
                        type="checkbox"
                        value={member.id}
                      />
                      <span>{member.displayName}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              {companies.length ? (
                <fieldset className="choice-field company-form-wide">
                  <legend>Organisations relacionadas</legend>
                  <div className="choice-grid">
                    {companies.map((company) => (
                      <label className="choice-option" key={company.id}>
                        <input
                          defaultChecked={selectedCompanies.has(company.id)}
                          name="company_id"
                          type="checkbox"
                          value={company.id}
                        />
                        <span>{company.name}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ) : null}
              <fieldset className="choice-field company-form-wide">
                <legend>Tasks relacionadas</legend>
                {tasks.length ? (
                  <div className="choice-grid">
                    {tasks.map((task) => (
                      <label className="choice-option" key={task.id}>
                        <input
                          defaultChecked={selectedTasks.has(task.id)}
                          name="task_id"
                          type="checkbox"
                          value={task.id}
                        />
                        <span>{task.title}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="field-help">Sem Tasks associadas.</p>
                )}
                <Link
                  className="button-secondary inline-form-link"
                  href={`/tasks/new?googleCalendar=${encodeURIComponent(calendarId)}&googleEvent=${encodeURIComponent(eventId)}&returnTo=${encodeURIComponent(`/calendar/google-event/${eventId}?calendar=${encodeURIComponent(calendarId)}`)}`}
                >
                  Criar nova Task
                </Link>
              </fieldset>
            </div>
          </details>

          <div className="field field-light company-form-wide">
            <label htmlFor="notes">Notas</label>
            <textarea
              defaultValue={artifact?.notes ?? ""}
              id="notes"
              maxLength={12000}
              name="notes"
              placeholder="Adicionar apontamentos internos..."
              rows={4}
            />
          </div>

          {classification === "meeting" ? (
            <div className="field field-light company-form-wide">
              <label htmlFor="output">Output da Meeting</label>
              <textarea
                defaultValue={artifact?.output ?? ""}
                id="output"
                maxLength={4000}
                name="output"
                placeholder="Resumo, conclusões ou ações acordadas..."
                rows={4}
              />
            </div>
          ) : null}
        </div>
      </FormFields>
      <FormFeedback message={state.message} />
      <div className="form-actions">
        <FormSubmit idleLabel="Guardar alterações no OS" />
      </div>
    </form>
  );
}
