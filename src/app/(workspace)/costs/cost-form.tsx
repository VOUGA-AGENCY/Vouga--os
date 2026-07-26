"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import type { CostFormOptions } from "@/application/costs/contracts";
import {
  COST_CATEGORIES,
  COST_CATEGORY_LABELS,
  COST_RECURRENCES,
  COST_RECURRENCE_LABELS,
  type CostType,
} from "@/domain/costs/cost";
import {
  FormFeedback,
  FormFields,
  FormSubmit,
  RequiredFieldsNote,
} from "@/foundation/ui/form-controls";
import type { CostDetail } from "@/projections/costs/cost-read-model";
import type { CostFormState } from "./actions";

type Action = (state: CostFormState, data: FormData) => Promise<CostFormState>;
export function CostForm({
  action,
  options,
  cost,
}: {
  action: Action;
  options: CostFormOptions;
  cost?: CostDetail;
}) {
  const [state, formAction] = useActionState(action, { message: null });
  const [type, setType] = useState<CostType>(cost?.costType ?? "one_off");
  const locked = cost?.status === "active";
  return (
    <form action={formAction} className="company-form object-form object-form-cost">
      <RequiredFieldsNote />
      <FormFields>
        <div className="company-form-grid object-form-grid">
          <Field label="Título" wide>
            <input
              defaultValue={cost?.title}
              id="title"
              name="title"
              maxLength={160}
              required
              placeholder="Ex.: Supabase Pro"
            />
          </Field>
          <Field label="Categoria">
            <select defaultValue={cost?.category ?? "software"} id="category" name="category">
              {COST_CATEGORIES.map((x) => (
                <option key={x} value={x}>
                  {COST_CATEGORY_LABELS[x]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Fornecedor">
            <input
              defaultValue={cost?.supplier ?? ""}
              id="supplier"
              name="supplier"
              maxLength={200}
              placeholder="Opcional"
            />
          </Field>
          <Field label="Descrição" wide>
            <textarea
              defaultValue={cost?.description}
              id="description"
              name="description"
              maxLength={4000}
              rows={4}
              required
              placeholder="Porque existe este custo e que operação suporta?"
            />
          </Field>
          <Field label="Tipo">
            <select
              disabled={Boolean(cost)}
              id="cost_type_visible"
              onChange={(e) => setType(e.target.value as CostType)}
              value={type}
            >
              <option value="one_off">Pontual</option>
              <option value="recurring">Recorrente</option>
            </select>
            <input name="cost_type" type="hidden" value={type} />
          </Field>
          <Field label="Valor esperado">
            <input
              defaultValue={cost ? (cost.expectedAmountMinor / 100).toFixed(2) : ""}
              id="expected_amount"
              inputMode="decimal"
              min="0.01"
              name="expected_amount"
              readOnly={locked}
              required
              step="0.01"
              type="number"
            />
          </Field>
          <Field label="Moeda">
            <input
              defaultValue={cost?.currency ?? "EUR"}
              id="currency"
              maxLength={3}
              minLength={3}
              name="currency"
              readOnly={locked}
              required
            />
          </Field>
          {type === "one_off" ? (
            <Field label="Data esperada">
              <input
                defaultValue={cost?.expectedOn ?? ""}
                id="expected_on"
                name="expected_on"
                required
                type="date"
              />
            </Field>
          ) : (
            <>
              <Field label="Recorrência">
                <select
                  defaultValue={cost?.recurrence ?? "monthly"}
                  disabled={locked}
                  id="recurrence_visible"
                  name={locked ? undefined : "recurrence"}
                >
                  {COST_RECURRENCES.map((x) => (
                    <option key={x} value={x}>
                      {COST_RECURRENCE_LABELS[x]}
                    </option>
                  ))}
                </select>
                {locked && <input name="recurrence" type="hidden" value={cost?.recurrence ?? ""} />}
              </Field>
              <Field label="Início">
                <input
                  defaultValue={cost?.startsOn ?? ""}
                  id="starts_on"
                  name="starts_on"
                  required
                  type="date"
                />
              </Field>
              <Field label="Primeira cobrança">
                <input
                  defaultValue={cost?.billingAnchorOn ?? ""}
                  id="billing_anchor_on"
                  name="billing_anchor_on"
                  readOnly={locked}
                  required
                  type="date"
                />
              </Field>
            </>
          )}
          <Select
            label="Owner"
            name="owner_member_id"
            value={cost?.ownerMemberId ?? ""}
            options={options.members.map((x) => ({
              id: x.id,
              label: x.displayName,
              meta: x.email,
            }))}
          />
          <Select
            label="Organisation relacionada"
            name="company_id"
            value={cost?.company?.id ?? ""}
            options={options.companies}
          />
          <Select
            label="Roadmap Item"
            name="roadmap_item_id"
            value={cost?.roadmapItem?.id ?? ""}
            options={options.roadmapItems}
          />
          <Select
            label="Decision de origem"
            name="source_decision_id"
            value={cost?.sourceDecision?.id ?? ""}
            options={options.decisions}
          />
          <fieldset className="choice-field company-form-wide">
            <legend>Tasks relacionadas</legend>
            <p className="field-help">
              Relaciona apenas trabalho que operacionaliza ou depende deste custo.
            </p>
            <div className="choice-grid">
              {options.tasks.map((option) => (
                <label className="choice-option" key={option.id}>
                  <input
                    defaultChecked={cost?.tasks.some((x) => x.id === option.id)}
                    name="task_id"
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
        </div>
      </FormFields>
      <FormFeedback message={state.message} />
      <div className="form-actions">
        <FormSubmit idleLabel={cost ? "Guardar alterações" : "Guardar custo"} />
        <Link className="button-secondary" href={cost ? `/costs/${cost.id}` : "/costs"}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
function Field({
  label,
  wide = false,
  children,
}: {
  label: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`field field-light${wide ? " company-form-wide" : ""}`}>
      <label>{label}</label>
      {children}
    </div>
  );
}
function Select({
  label,
  name,
  value,
  options,
}: {
  label: string;
  name: string;
  value: string;
  options: readonly { id: string; label: string; meta?: string }[];
}) {
  return (
    <Field label={label}>
      <select defaultValue={value} name={name}>
        <option value="">Sem relação</option>
        {options.map((x) => (
          <option key={x.id} value={x.id}>
            {x.label}
            {x.meta ? ` · ${x.meta}` : ""}
          </option>
        ))}
      </select>
    </Field>
  );
}
