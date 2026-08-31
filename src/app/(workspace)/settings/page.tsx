import { Link2, LogOut, MonitorCog, UserCircle2 } from "lucide-react";

import { signOut } from "@/application/auth/actions";
import { getAuthenticatedUser } from "@/application/auth/current-user";
import { ThemeSwitcher } from "@/foundation/appearance/theme-switcher";
import {
  createGoogleConnectionReadModel,
  createGoogleIntegrationModule,
} from "@/foundation/composition/google";
import { getGoogleOAuthEnv } from "@/foundation/config/google-env";
import { canManageGoogle } from "@/foundation/security/google-access";

import { disconnectGoogleAction, saveGoogleCalendarsAction } from "./google-actions";

export default async function SettingsPage() {
  const user = await getAuthenticatedUser();
  const email = user?.email ?? "Sessão Vouga";
  const managesGoogle = user ? canManageGoogle(user.role) : false;
  let googleStorageAvailable = Boolean(user);
  let googleConnection = null;
  let googleCalendars = null;
  if (user && managesGoogle) {
    try {
      googleConnection = await (
        await createGoogleConnectionReadModel()
      ).findActiveByMemberId(user.id);
    } catch {
      googleStorageAvailable = false;
    }
  }
  const googleConfigured = Boolean(getGoogleOAuthEnv());
  if (user && managesGoogle && googleConnection && googleConfigured) {
    try {
      googleCalendars = await (
        await createGoogleIntegrationModule()
      ).calendarService.listCalendars(user.id);
    } catch {
      googleCalendars = null;
    }
  }

  return (
    <main className="workspace-main module-main settings-page">
      <div className="module-heading">
        <div>
          <h1 className="display">Settings & Account</h1>
          <p className="workspace-intro">Sessão e preferências.</p>
        </div>
      </div>

      <nav aria-label="Secções de Settings" className="settings-index">
        <a href="#profile">Profile</a>
        {managesGoogle ? <a href="#google">Google</a> : null}
        <a href="#appearance">Appearance</a>
        <a href="#language">Language</a>
        <a href="#session">Session</a>
        <a href="#about">About</a>
      </nav>

      <div className="settings-sections">
        {managesGoogle ? <SettingsSection
          description="Identidade usada nesta sessão autenticada."
          icon={<UserCircle2 aria-hidden="true" />}
          id="profile"
          title="Profile"
        >
          <dl className="settings-definition">
            <div>
              <dt>Email</dt>
              <dd>{email}</dd>
            </div>
            <div>
              <dt>Gestão</dt>
              <dd>Identidade provisionada manualmente através de Supabase Auth.</dd>
            </div>
          </dl>
          <p className="settings-note">
            Edição de perfil e gestão de conta ainda não existem no produto.
          </p>
        </SettingsSection> : null}

        <SettingsSection
          description="Calendar e Docs na mesma conta Google."
          icon={<Link2 aria-hidden="true" />}
          id="google"
          title="Google Workspace"
        >
          {!googleStorageAvailable ? (
            <p className="settings-note settings-note-inline">
              A estrutura local está pronta. Falta aplicar a migration Google à base de dados.
            </p>
          ) : !googleConfigured ? (
            <p className="settings-note settings-note-inline">
              A configuração Google do servidor ainda está incompleta.
            </p>
          ) : googleConnection ? (
            <div className="google-integration-settings">
              <div className="google-connection">
                <div>
                  <span className="google-connection-status">Ligado</span>
                  <strong>{googleConnection.email}</strong>
                  <p>Calendar e ficheiros escolhidos no Drive.</p>
                </div>
                <form action={disconnectGoogleAction}>
                  <button className="button-secondary" type="submit">
                    Desligar
                  </button>
                </form>
              </div>

              {googleCalendars ? (
                <form action={saveGoogleCalendarsAction} className="google-calendar-selection">
                  <fieldset>
                    <legend>Calendários visíveis</legend>
                    <p>Escolhe o que entra no Calendar do Vouga OS.</p>
                    <div className="google-calendar-options">
                      {googleCalendars.map((calendar) => (
                        <label key={calendar.id}>
                          <input
                            defaultChecked={calendar.selected}
                            name="calendar_id"
                            type="checkbox"
                            value={calendar.id}
                          />
                          <span>
                            {calendar.name}
                            {calendar.primary ? <small>Principal</small> : null}
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <fieldset>
                    <legend>Publicar Meetings e Events</legend>
                    <p>Escolhe um calendário Google. Os participantes ficam apenas no OS.</p>
                    <div className="google-calendar-options">
                      {googleCalendars
                        .filter((calendar) => calendar.accessRole !== "reader")
                        .map((calendar) => (
                          <label key={calendar.id}>
                            <input
                              defaultChecked={calendar.publishesOsEvents}
                              name="publish_calendar_id"
                              type="radio"
                              value={calendar.id}
                            />
                            <span>{calendar.name}</span>
                          </label>
                        ))}
                    </div>
                  </fieldset>
                  <button className="button-secondary" type="submit">
                    Guardar calendários
                  </button>
                </form>
              ) : (
                <p className="settings-note settings-note-inline">
                  A seleção de calendários ainda não está disponível na base de dados.
                </p>
              )}
            </div>
          ) : (
            <div className="google-connection">
              <div>
                <strong>Sem conta ligada</strong>
                <p>Autoriza Calendar e os Docs que escolheres.</p>
              </div>
              <a className="button-primary" href="/api/google/oauth/start">
                Ligar Google
              </a>
            </div>
          )}
        </SettingsSection>

        <SettingsSection
          description="Escolhe como os tokens oficiais são resolvidos nesta aplicação."
          icon={<MonitorCog aria-hidden="true" />}
          id="appearance"
          title="Appearance"
        >
          <ThemeSwitcher />
        </SettingsSection>

        <SettingsSection
          description="Estrutura preparada para uma futura preferência de idioma."
          id="language"
          title="Language"
        >
          <div className="field field-light settings-field">
            <label htmlFor="language-preference">Idioma da interface</label>
            <select disabled id="language-preference" value="pt-PT">
              <option value="pt-PT">Português (Portugal)</option>
            </select>
            <span className="field-help">
              A aplicação permanece em português. Não existe ainda infraestrutura de tradução.
            </span>
          </div>
        </SettingsSection>

        <SettingsSection
          description="Sessão atualmente ativa neste browser."
          id="session"
          title="Session"
        >
          <div className="settings-session">
            <div>
              <span className="eyebrow">Autenticado como</span>
              <strong>{email}</strong>
            </div>
            <form action={signOut}>
              <button className="button-secondary" type="submit">
                <LogOut aria-hidden="true" />
                Terminar sessão
              </button>
            </form>
          </div>
        </SettingsSection>

        <SettingsSection
          description="Informação desta instalação do produto."
          id="about"
          title="About"
        >
          <dl className="settings-definition">
            <div>
              <dt>Produto</dt>
              <dd>Vouga OS</dd>
            </div>
            <div>
              <dt>Versão</dt>
              <dd>V1 · Product Hardening</dd>
            </div>
            <div>
              <dt>Preferências futuras</dt>
              <dd>
                Esta área pode crescer quando existirem capacidades reais, sem antecipar opções
                inativas.
              </dd>
            </div>
          </dl>
        </SettingsSection>
      </div>
    </main>
  );
}

function SettingsSection({
  children,
  description,
  icon,
  id,
  title,
}: {
  children: React.ReactNode;
  description: string;
  icon?: React.ReactNode;
  id: string;
  title: string;
}) {
  return (
    <section aria-labelledby={`${id}-title`} className="settings-section" id={id}>
      <header>
        <div className="settings-section-title">
          {icon}
          <h2 id={`${id}-title`}>{title}</h2>
        </div>
        <p>{description}</p>
      </header>
      <div className="settings-section-content">{children}</div>
    </section>
  );
}
