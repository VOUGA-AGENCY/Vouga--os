import Link from "next/link";

export default function ProjectNotFound() {
  return (
    <main className="workspace-main module-main">
      <section className="empty-state empty-state-inline">
        <h1 className="display">Project não encontrado.</h1>
        <p>O Project não existe ou já não está disponível.</p>
        <Link className="button-secondary" href="/projects">
          Voltar a Projects
        </Link>
      </section>
    </main>
  );
}
