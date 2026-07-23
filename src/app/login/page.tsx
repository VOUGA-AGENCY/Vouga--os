import { BrandMark } from "@/foundation/appearance/brand-mark";
import { getSupabasePublicEnv } from "@/foundation/config/supabase-env";

import { LoginForm } from "./login-form";

export default function LoginPage() {
  const configured = Boolean(getSupabasePublicEnv());

  return (
    <main className="login-shell">
      <div className="login-brand brand">
        <BrandMark priority />
        <span>Vouga OS</span>
      </div>
      <section aria-hidden="true" className="login-visual">
        <BrandMark className="login-mark" priority size={112} />
      </section>
      <section className="login-panel">
        <p className="eyebrow">Acesso reservado</p>
        <h1 className="display">Entrar</h1>
        <p>Uma superfície fechada para manter trabalho, contexto e decisões no mesmo sistema.</p>
        {!configured && (
          <div className="setup-notice" role="status">
            A aplicação está pronta. Para ativar o login, copia <code>.env.example</code> para{" "}
            <code>.env.local</code> e preenche as duas variáveis públicas do projeto Supabase.
          </div>
        )}
        <LoginForm configured={configured} />
      </section>
    </main>
  );
}
