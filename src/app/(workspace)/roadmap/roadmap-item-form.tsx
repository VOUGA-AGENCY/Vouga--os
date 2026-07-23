"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import type { RoadmapFormOptions } from "@/application/roadmap/contracts";
import {
  ROADMAP_HORIZON_LABELS,
  ROADMAP_KIND_LABELS,
  type RoadmapHorizon,
  type RoadmapKind,
} from "@/domain/roadmap/roadmap-item";
import type { RoadmapItemDetail } from "@/projections/roadmap/roadmap-read-model";
import {
  FormFeedback,
  FormFields,
  FormSubmit,
  RequiredFieldsNote,
} from "@/foundation/ui/form-controls";
import type { RoadmapFormState } from "./actions";

type Action = (state: RoadmapFormState, data: FormData) => Promise<RoadmapFormState>;
export function RoadmapItemForm({
  action,
  options,
  item,
}: {
  action: Action;
  options: RoadmapFormOptions;
  item?: RoadmapItemDetail;
}) {
  const [state, formAction] = useActionState(action, { message: null });
  const [horizon, setHorizon] = useState<RoadmapHorizon>(item?.horizon ?? "next");
  const selected = (group: "companies" | "tasks" | "sprints" | "decisions", id: string) =>
    item?.[group].some((link) => link.id === id) ?? false;
  return (
    <form action={formAction} className="company-form object-form object-form-roadmap">
      <RequiredFieldsNote />
      <FormFields>
        <div className="company-form-grid object-form-grid">
          <div className="field field-light company-form-wide">
            <label htmlFor="title">Título</label>
            <input
              defaultValue={item?.title}
              id="title"
              maxLength={160}
              name="title"
              placeholder="Ex.: Reduzir o tempo até ao primeiro valor entregue"
              required
            />
          </div>
          <div className="field field-light">
            <label htmlFor="kind">Tipo</label>
            <select defaultValue={item?.kind ?? "problem"} id="kind" name="kind" required>
              {(Object.entries(ROADMAP_KIND_LABELS) as [RoadmapKind, string][]).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ),
              )}
            </select>
          </div>
          <div className="field field-light">
            <label htmlFor="horizon">Horizonte</label>
            <select
              id="horizon"
              name="horizon"
              onChange={(event) => setHorizon(event.target.value as RoadmapHorizon)}
              value={horizon}
            >
              {(Object.entries(ROADMAP_HORIZON_LABELS) as [RoadmapHorizon, string][]).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ),
              )}
            </select>
            <p className="field-help">Mudar o horizonte exige uma Decision relacionada.</p>
          </div>
          <div className="field field-light company-form-wide">
            <label htmlFor="description">Descrição</label>
            <textarea
              defaultValue={item?.description}
              id="description"
              maxLength={4000}
              name="description"
              placeholder="Explica a intenção estratégica sem a transformar numa lista de trabalho."
              required
              rows={4}
            />
          </div>
          <div className="field field-light company-form-wide">
            <label htmlFor="evidence">Evidência</label>
            <textarea
              defaultValue={item?.evidence}
              id="evidence"
              maxLength={4000}
              name="evidence"
              placeholder="Ex.: Três projetos recentes demoraram mais de uma semana até à primeira validação."
              required
              rows={4}
            />
          </div>
          <div className="field field-light company-form-wide">
            <label htmlFor="owner_member_id">
              Owner {horizon === "now" ? "obrigatório em Now" : "opcional"}
            </label>
            <select
              defaultValue={item?.ownerMemberId ?? ""}
              id="owner_member_id"
              name="owner_member_id"
              required={horizon === "now"}
            >
              <option value="">Sem owner assumido</option>
              {options.members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.displayName} · {member.email}
                </option>
              ))}
            </select>
          </div>
          <Choices
            legend="Organisations relacionadas"
            name="company_id"
            options={options.companies}
            selected={(id) => selected("companies", id)}
          />
          <Choices
            help={
              horizon === "now"
                ? "Now exige pelo menos uma Task como movimento executável."
                : "A execução continua a pertencer às Tasks."
            }
            legend="Tasks relacionadas"
            name="task_id"
            options={options.tasks}
            selected={(id) => selected("tasks", id)}
          />
          <Choices
            legend="Sprints relacionadas"
            name="sprint_id"
            options={options.sprints}
            selected={(id) => selected("sprints", id)}
          />
          <Choices
            help={
              item
                ? "Seleciona pelo menos uma Decision se alterares o horizonte."
                : "Relaciona escolhas que explicam a direção."
            }
            legend="Decisions relacionadas"
            name="decision_id"
            options={options.decisions}
            selected={(id) => selected("decisions", id)}
          />
        </div>
      </FormFields>
      <FormFeedback message={state.message} />
      <div className="form-actions">
        <FormSubmit idleLabel={item ? "Save changes" : "Save item"} />
        <Link className="button-secondary" href={item ? `/roadmap/${item.id}` : "/roadmap"}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
function Choices({
  legend,
  help,
  name,
  options,
  selected,
}: {
  legend: string;
  help?: string;
  name: string;
  options: RoadmapFormOptions["tasks"];
  selected: (id: string) => boolean;
}) {
  return (
    <fieldset className="choice-field company-form-wide">
      <legend>{legend}</legend>
      {help && <p className="field-help">{help}</p>}
      {options.length === 0 ? (
        <p className="muted-copy">Sem opções disponíveis.</p>
      ) : (
        <div className="choice-grid">
          {options.map((option) => (
            <label className="choice-option" key={option.id}>
              <input
                defaultChecked={selected(option.id)}
                name={name}
                type="checkbox"
                value={option.id}
              />
              <span>
                {option.label}
                {option.meta && <small>{option.meta}</small>}
              </span>
            </label>
          ))}
        </div>
      )}
    </fieldset>
  );
}
