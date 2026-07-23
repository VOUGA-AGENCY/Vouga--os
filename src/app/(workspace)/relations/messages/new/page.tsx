import Link from "next/link";
import { createTemplateAction } from "../../actions";
export default function NewMessagePage() {
  return (
    <main className="workspace-main module-main object-form-page">
      <p className="eyebrow">Contacts</p>
      <h1 className="display">Novo guião</h1>
      <form action={createTemplateAction} className="object-form relation-form">
        <div className="object-form-grid company-form-grid">
          <div className="field field-light">
            <label htmlFor="name">Nome</label>
            <input id="name" name="name" required maxLength={120} />
          </div>
          <div className="field field-light">
            <label htmlFor="situation">Situação</label>
            <input id="situation" name="situation" required maxLength={120} placeholder="Primeiro contacto" />
          </div>
          <div className="field field-light">
            <label htmlFor="channel">Canal</label>
            <select id="channel" name="channel">
              <option value="email">Email</option>
              <option value="linkedin">LinkedIn</option>
              <option value="call">Chamada</option>
            </select>
          </div>
          <div className="field field-light company-form-wide">
            <label htmlFor="body">Texto para copiar</label>
            <textarea id="body" name="body" required rows={10} maxLength={8000} />
          </div>
        </div>
        <div className="form-actions">
          <button className="button-primary" type="submit">
            Guardar guião
          </button>
          <Link className="button-secondary" href="/relations?view=scripts">
            Cancelar
          </Link>
        </div>
      </form>
    </main>
  );
}
