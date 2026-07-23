"use client";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <main className="workspace-main module-main">
      <section className="empty-state">
        <p className="eyebrow">Costs indisponíveis</p>
        <h1 className="display">Não foi possível carregar os custos.</h1>
        <p>O contexto financeiro não foi alterado. Tenta novamente.</p>
        <button className="button-secondary" onClick={reset}>
          Tentar novamente
        </button>
      </section>
    </main>
  );
}
