export default function WorkspaceLoading() {
  return (
    <main className="workspace-main module-main" aria-busy="true" aria-live="polite">
      <p className="eyebrow">Vouga OS</p>
      <h1 className="display">A abrir o workspace…</h1>
      <div className="foundation-grid">
        {["Calendar", "Work", "Contacts"].map((label) => (
          <article className="foundation-card" key={label}>
            <span className="status">A carregar</span>
            <h2>{label}</h2>
            <p>Leitura das fontes oficiais em curso.</p>
          </article>
        ))}
      </div>
    </main>
  );
}
