"use client";
import { useActionState } from "react";
import type { ActiveMember } from "@/application/members/contracts";
import { FormFeedback, FormSubmit } from "@/foundation/ui/form-controls";
import { isoToLisbonLocalDateTime } from "@/projections/calendar/calendar-time";
import { recordCashBalanceAction, type CostFormState } from "./actions";

export function CashBalanceForm({ members }: { members: readonly ActiveMember[] }) {
  const [state, action] = useActionState<CostFormState, FormData>(recordCashBalanceAction, {
    message: null,
  });
  const now = isoToLisbonLocalDateTime(new Date().toISOString());
  return (
    <form action={action} className="cash-balance-form">
      <div className="company-form-grid">
        <div className="field field-light">
          <label htmlFor="balance">Saldo na conta</label>
          <input id="balance" min="0" name="balance" required step=".01" type="number" />
        </div>
        <div className="field field-light">
          <label htmlFor="balance_currency">Moeda</label>
          <input defaultValue="EUR" id="balance_currency" maxLength={3} name="currency" required />
        </div>
        <div className="field field-light">
          <label htmlFor="confirmed_at">Confirmado em</label>
          <input
            defaultValue={now}
            id="confirmed_at"
            name="confirmed_at"
            required
            type="datetime-local"
          />
        </div>
        <div className="field field-light">
          <label htmlFor="confirmed_by_member_id">Confirmado por</label>
          <select id="confirmed_by_member_id" name="confirmed_by_member_id" required>
            <option value="">Selecionar</option>
            {members.map((x) => (
              <option key={x.id} value={x.id}>
                {x.displayName}
              </option>
            ))}
          </select>
        </div>
        <div className="field field-light company-form-wide">
          <label htmlFor="balance_description">Nota</label>
          <input
            id="balance_description"
            maxLength={500}
            name="description"
            placeholder="Ex.: saldo visto no homebanking"
          />
        </div>
      </div>
      <FormFeedback message={state.message} />
      <FormSubmit idleLabel="Confirmar saldo" pendingLabel="A confirmar…" />
    </form>
  );
}
