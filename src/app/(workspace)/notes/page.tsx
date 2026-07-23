import { ExternalLink, FileText, Plus, Search } from "lucide-react";
import type { ReactNode } from "react";

import { getAuthenticatedUser } from "@/application/auth/current-user";
import { getGoogleDriveDocumentErrorMessage } from "@/application/google/google-drive-document-service";
import {
  createGoogleConnectionReadModel,
  createGoogleIntegrationModule,
} from "@/foundation/composition/google";
import { getGoogleOAuthEnv } from "@/foundation/config/google-env";

import { createGoogleDocumentAction } from "./actions";

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const [{ q }, user] = await Promise.all([searchParams, getAuthenticatedUser()]);
  const query = q?.trim() ?? "";
  const googleConfigured = Boolean(getGoogleOAuthEnv());
  let googleStorageAvailable = Boolean(user);
  let googleConnection = null;
  let documents = null;
  let errorMessage = null;

  if (user) {
    try {
      googleConnection = await (
        await createGoogleConnectionReadModel()
      ).findActiveByMemberId(user.id);
    } catch {
      googleStorageAvailable = false;
    }
  }

  if (user && googleConnection && googleConfigured) {
    try {
      documents = await (await createGoogleIntegrationModule()).documentService.listDocuments(
        user.id,
        query || null,
      );
    } catch (error) {
      errorMessage = getGoogleDriveDocumentErrorMessage(error);
      documents = null;
    }
  }

  return (
    <main className="workspace-main module-main notes-main">
      <div className="module-heading">
        <div>
          <h1 className="display">Notes</h1>
        </div>
        {googleConnection && googleConfigured ? (
          <div className="notes-heading-actions">
            <a className="button-secondary" href="/api/google/picker/start">
              Add existing
            </a>
            <form action={createGoogleDocumentAction} className="notes-create-form">
              <input
                aria-label="Título do novo Google Doc"
                maxLength={180}
                name="title"
                placeholder="Novo documento"
                required
                type="text"
              />
              <button className="button-primary" type="submit">
                <Plus aria-hidden="true" />
                New doc
              </button>
            </form>
          </div>
        ) : null}
      </div>

      {!googleStorageAvailable ? (
        <NotesState
          label="Google indisponível"
          text="Aplica a migration Google antes de usar Docs no OS."
        />
      ) : !googleConfigured ? (
        <NotesState
          label="Google por configurar"
          text="Completa as variáveis Google no servidor."
        />
      ) : !googleConnection ? (
        <NotesState
          action={<a className="button-primary" href="/api/google/oauth/start">Ligar Google</a>}
          label="Google Workspace desligado"
          text="Liga a conta Google para criar e abrir Docs a partir do OS."
        />
      ) : errorMessage ? (
        <NotesState label="Docs indisponível" text={errorMessage} />
      ) : (
        <>
          <form action="/notes" className="notes-search" method="get">
            <Search aria-hidden="true" />
            <input
              aria-label="Pesquisar documentos"
              defaultValue={query}
              name="q"
              placeholder="Search docs"
              type="search"
            />
            {query ? (
              <a className="button-secondary" href="/notes">
                Clear
              </a>
            ) : null}
          </form>

          {documents?.length ? (
            <section aria-label="Google Docs" className="notes-list">
              {documents.map((document) => (
                <a
                  className="notes-row"
                  href={document.htmlLink}
                  key={document.id}
                  rel="noreferrer"
                  target="_blank"
                >
                  <FileText aria-hidden="true" />
                  <span>
                    <strong>{document.title}</strong>
                    <small>{formatDocumentMeta(document)}</small>
                  </span>
                  <ExternalLink aria-hidden="true" />
                </a>
              ))}
            </section>
          ) : (
            <NotesState
              label={query ? "Sem resultados." : "Sem documentos."}
              text={
                query
                  ? "Nenhum Google Doc acessível à app corresponde à pesquisa."
                  : "Cria o primeiro Google Doc a partir do OS."
              }
            />
          )}
        </>
      )}
    </main>
  );
}

function NotesState({
  action,
  label,
  text,
}: {
  action?: ReactNode;
  label: string;
  text: string;
}) {
  return (
    <section className="empty-state empty-state-inline notes-empty">
      <FileText aria-hidden="true" />
      <h2 className="section-title">{label}</h2>
      <p>{text}</p>
      {action}
    </section>
  );
}

function formatDocumentMeta(document: {
  createdAt: string | null;
  modifiedAt: string | null;
}) {
  const value = document.modifiedAt ?? document.createdAt;
  if (!value) return "Google Docs";
  return `Atualizado ${new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "medium",
    timeZone: "Europe/Lisbon",
  }).format(new Date(value))}`;
}
