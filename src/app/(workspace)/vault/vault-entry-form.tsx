"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  FormFeedback,
  FormFields,
  FormSubmit,
  RequiredFieldsNote,
} from "@/foundation/ui/form-controls";

import { createVaultEntryAction } from "./actions";

const initial = { message: null };

export function VaultEntryForm() {
  const [state, action] = useActionState(createVaultEntryAction, initial);
  return (
    <form action={action} className="company-form object-form vault-form">
      <RequiredFieldsNote />
      <FormFields>
        <div className="company-form-grid object-form-grid">
          <div className="field field-light company-form-wide">
            <label htmlFor="service_name">Serviço</label>
            <input id="service_name" maxLength={120} name="service_name" required />
          </div>
          <div className="field field-light company-form-wide">
            <label htmlFor="url">URL</label>
            <input id="url" maxLength={2048} name="url" placeholder="https://" type="url" />
          </div>
          <div className="field field-light company-form-wide">
            <label htmlFor="username">Username ou email</label>
            <input autoComplete="off" id="username" maxLength={320} name="username" required />
          </div>
          <div className="field field-light company-form-wide">
            <label htmlFor="password">Password</label>
            <input
              autoComplete="new-password"
              id="password"
              maxLength={4096}
              name="password"
              required
              type="password"
            />
          </div>
          <div className="field field-light company-form-wide">
            <label htmlFor="note">Nota</label>
            <textarea id="note" maxLength={1000} name="note" rows={4} />
          </div>
        </div>
      </FormFields>
      <FormFeedback message={state.message} />
      <div className="form-actions">
        <FormSubmit idleLabel="Save" />
        <Link className="button-secondary" href="/vault">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
