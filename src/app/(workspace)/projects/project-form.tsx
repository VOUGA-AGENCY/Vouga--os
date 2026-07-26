"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";

import type { ProjectFormOptions } from "@/application/projects/contracts";
import type { ProjectFormState } from "@/application/projects/project-service";
import {
  FormFeedback,
  FormFields,
  FormSubmit,
  RequiredFieldsNote,
} from "@/foundation/ui/form-controls";
import type { ProjectDetail } from "@/projections/projects/project-read-model";

type Action = (state: ProjectFormState, data: FormData) => Promise<ProjectFormState>;

export function ProjectForm({
  action,
  options,
  project,
}: {
  action: Action;
  options: ProjectFormOptions;
  project?: ProjectDetail;
}) {
  const [state, formAction] = useActionState(action, { message: null });
  const [companyId, setCompanyId] = useState(project?.client.id ?? options.companies[0]?.id ?? "");
  const [taskIds, setTaskIds] = useState(
    () => new Set(project?.tasks.map((item) => item.id) ?? []),
  );
  const selected = useMemo(
    () => ({
      members: new Set(project?.team.map((item) => item.id) ?? []),
      contacts: new Set(project?.contacts.map((item) => item.id) ?? []),
      meetings: new Set(project?.meetings.map((item) => item.id) ?? []),
      decisions: new Set(project?.decisions.map((item) => item.id) ?? []),
      costs: new Set(project?.costs.map((item) => item.id) ?? []),
    }),
    [project],
  );
  const milestones = [...(project?.milestones ?? [])];
  while (milestones.length < 5) {
    milestones.push({ id: "", title: "", position: milestones.length, completedAt: null });
  }
  const resources = [...(project?.resources ?? [])];
  while (resources.length < 6) {
    resources.push({ id: "", title: "", kind: null, url: "", position: resources.length });
  }
  const openTasks = options.tasks.filter(
    (item) => taskIds.has(item.id) && !["completed", "cancelled"].includes(item.status ?? ""),
  );

  return (
    <form action={formAction} className="company-form object-form project-form">
      <RequiredFieldsNote />
      <FormFields>
        <section className="project-form-section">
          <div className="company-form-grid object-form-grid">
            <Field label="Nome" wide>
              <input defaultValue={project?.name} maxLength={160} name="name" required />
            </Field>
            <Field label="Cliente">
              <select
                name="client_company_id"
                onChange={(event) => setCompanyId(event.target.value)}
                required
                value={companyId}
              >
                {options.companies.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Responsável Vouga">
              <select
                defaultValue={project?.owner.id ?? options.members[0]?.id}
                name="owner_member_id"
                required
              >
                {options.members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.displayName}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Início">
              <input defaultValue={project?.startsOn} name="starts_on" required type="date" />
            </Field>
            <Field label="Entrega prevista">
              <input
                defaultValue={project?.targetDeliveryOn}
                name="target_delivery_on"
                required
                type="date"
              />
            </Field>
            <Field label="Valor acordado">
              <input
                defaultValue={project ? (project.agreedAmountMinor / 100).toFixed(2) : undefined}
                min="0.01"
                name="agreed_amount"
                required
                step="0.01"
                type="number"
              />
            </Field>
            <Field label="Valor recebido">
              <input
                defaultValue={project ? (project.receivedAmountMinor / 100).toFixed(2) : "0.00"}
                min="0"
                name="received_amount"
                required
                step="0.01"
                type="number"
              />
            </Field>
            <Field label="Moeda">
              <input
                defaultValue={project?.currency ?? "EUR"}
                maxLength={3}
                minLength={3}
                name="currency"
                required
              />
            </Field>
            <Field label="Objetivo" wide>
              <textarea
                defaultValue={project?.objective}
                maxLength={800}
                name="objective"
                required
                rows={3}
              />
            </Field>
            <Field label="Resultado esperado" wide>
              <textarea
                defaultValue={project?.expectedResult}
                maxLength={800}
                name="expected_result"
                required
                rows={3}
              />
            </Field>
          </div>
        </section>

        <details className="project-form-disclosure" open={Boolean(project)}>
          <summary>Âmbito e marcos</summary>
          <div className="company-form-grid object-form-grid project-form-disclosure-content">
            <Field label="Âmbito acordado" wide>
              <textarea
                defaultValue={project?.scopeItems
                  .filter((item) => item.kind === "in_scope")
                  .map((item) => item.label)
                  .join("\n")}
                name="scope_items"
                placeholder="Um item por linha"
                rows={5}
              />
            </Field>
            <Field label="Fora do âmbito" wide>
              <textarea
                defaultValue={project?.scopeItems
                  .filter((item) => item.kind === "out_of_scope")
                  .map((item) => item.label)
                  .join("\n")}
                name="out_of_scope_items"
                placeholder="Um item por linha"
                rows={4}
              />
            </Field>
            <fieldset className="project-repeat-field company-form-wide">
              <legend>Marcos</legend>
              <div className="project-repeat-list">
                {milestones.map((milestone, index) => (
                  <div className="project-repeat-row project-milestone-input" key={index}>
                    <input name="milestone_id" type="hidden" value={milestone.id} />
                    <input
                      name="milestone_completed_at"
                      type="hidden"
                      value={milestone.completedAt ?? ""}
                    />
                    <input
                      aria-label={`Marco ${index + 1}`}
                      defaultValue={milestone.title}
                      maxLength={240}
                      name="milestone_title"
                      placeholder={`Marco ${index + 1}`}
                    />
                    <label className="project-check">
                      <input
                        defaultChecked={Boolean(milestone.completedAt)}
                        name="milestone_completed"
                        type="checkbox"
                        value={index}
                      />
                      <span>Concluído</span>
                    </label>
                  </div>
                ))}
              </div>
            </fieldset>
          </div>
        </details>

        <details className="project-form-disclosure">
          <summary>Pessoas e trabalho associado</summary>
          <div className="project-form-disclosure-content">
            <Choices
              defaults={selected.members}
              empty="Sem Members."
              name="team_member_id"
              options={options.members.map((member) => ({
                id: member.id,
                label: member.displayName,
                meta: member.email,
              }))}
              title="Equipa Vouga"
            />
            <Choices
              defaults={selected.contacts}
              empty="Sem Perfis ativos nesta Organisation."
              name="contact_id"
              options={options.contacts.filter((item) => item.companyId === companyId)}
              title="Pessoas do cliente"
            />
            <fieldset className="choice-field company-form-wide">
              <legend>Tasks</legend>
              <div className="choice-grid">
                {options.tasks.map((option) => (
                  <label className="choice-option" key={option.id}>
                    <input
                      checked={taskIds.has(option.id)}
                      name="task_id"
                      onChange={(event) => {
                        const next = new Set(taskIds);
                        if (event.target.checked) next.add(option.id);
                        else next.delete(option.id);
                        setTaskIds(next);
                      }}
                      type="checkbox"
                      value={option.id}
                    />
                    <span>
                      {option.label}
                      <small>{option.meta}</small>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="field field-light company-form-wide">
              <label htmlFor="next_task_id">Próxima ação</label>
              <select
                defaultValue={project?.nextTask?.id ?? ""}
                id="next_task_id"
                name="next_task_id"
              >
                <option value="">Sem próxima ação</option>
                {openTasks.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="field-help">Usa uma Task aberta associada; não duplica trabalho.</p>
            </div>
            <Choices
              defaults={selected.meetings}
              empty="Sem Meetings ou Events."
              name="meeting_id"
              options={options.meetings}
              title="Meetings e Events"
            />
            <Choices
              defaults={selected.decisions}
              empty="Sem Decisions."
              name="decision_id"
              options={options.decisions}
              title="Decisions"
            />
            <Choices
              defaults={selected.costs}
              empty="Sem Costs."
              name="cost_id"
              options={options.costs}
              title="Costs externos"
            />
          </div>
        </details>

        <details className="project-form-disclosure">
          <summary>Recursos</summary>
          <div className="project-form-disclosure-content">
            <fieldset className="project-repeat-field company-form-wide">
              <legend>Links essenciais</legend>
              <div className="project-repeat-list">
                {resources.map((resource, index) => (
                  <div className="project-repeat-row project-resource-input" key={index}>
                    <input name="resource_id" type="hidden" value={resource.id} />
                    <input
                      aria-label={`Título do recurso ${index + 1}`}
                      defaultValue={resource.title}
                      maxLength={160}
                      name="resource_title"
                      placeholder="Título"
                    />
                    <input
                      aria-label={`Tipo do recurso ${index + 1}`}
                      defaultValue={resource.kind ?? ""}
                      maxLength={80}
                      name="resource_kind"
                      placeholder="Tipo"
                    />
                    <input
                      aria-label={`URL do recurso ${index + 1}`}
                      defaultValue={resource.url}
                      name="resource_url"
                      placeholder="https://"
                      type="url"
                    />
                  </div>
                ))}
              </div>
            </fieldset>
          </div>
        </details>
      </FormFields>
      <FormFeedback message={state.message} />
      <div className="form-actions">
        <FormSubmit idleLabel={project ? "Guardar alterações" : "Criar Project"} />
        <Link className="button-secondary" href={project ? `/projects/${project.id}` : "/projects"}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}

function Field({
  children,
  label,
  wide,
}: {
  children: React.ReactNode;
  label: string;
  wide?: boolean;
}) {
  return (
    <div className={`field field-light${wide ? " company-form-wide" : ""}`}>
      <label>{label}</label>
      {children}
    </div>
  );
}

function Choices({
  defaults,
  empty,
  name,
  options,
  title,
}: {
  defaults: Set<string>;
  empty: string;
  name: string;
  options: readonly { id: string; label: string; meta?: string }[];
  title: string;
}) {
  return (
    <fieldset className="choice-field company-form-wide">
      <legend>{title}</legend>
      {options.length ? (
        <div className="choice-grid">
          {options.map((option) => (
            <label className="choice-option" key={option.id}>
              <input
                defaultChecked={defaults.has(option.id)}
                name={name}
                type="checkbox"
                value={option.id}
              />
              <span>
                {option.label}
                {option.meta ? <small>{option.meta}</small> : null}
              </span>
            </label>
          ))}
        </div>
      ) : (
        <p className="field-help">{empty}</p>
      )}
    </fieldset>
  );
}
