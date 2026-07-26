"use client";

export default function ProjectsError({ reset }: { reset: () => void }) {
  return (
    <main className="workspace-main module-main">
      <section className="empty-state empty-state-inline">
        <h1 className="display">Não foi possível carregar Projects.</h1>
        <p>Confirma que a migration local aprovada foi aplicada ao ambiente.</p>
        <button className="button-secondary" onClick={reset} type="button">
          Tentar novamente
        </button>
      </section>
    </main>
  );
}
