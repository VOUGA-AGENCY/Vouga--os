import Link from "next/link";
export default function NotFound() {
  return (
    <main className="workspace-main module-main">
      <section className="empty-state">
        <p className="eyebrow">Cost não encontrado</p>
        <h1 className="display">Este compromisso não está disponível.</h1>
        <p>Pode ter sido removido do contexto acessível ou o endereço está incorreto.</p>
        <Link className="button-secondary" href="/costs">
          Voltar a Costs
        </Link>
      </section>
    </main>
  );
}
