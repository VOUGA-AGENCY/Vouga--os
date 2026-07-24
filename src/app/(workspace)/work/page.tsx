import Link from "next/link";
import { FileText, ListChecks } from "lucide-react";

export default function WorkPage() {
  return (
    <main className="workspace-main module-main intent-page work-page">
      <div className="module-heading">
        <div>
          <h1 className="display">Work</h1>
          <p className="workspace-intro">Trabalho em curso.</p>
        </div>
      </div>
      <section aria-label="Áreas de Work" className="intent-grid work-intent-grid">
        <Link className="intent-card work-square-card" href="/tasks">
          <div className="work-card-icon">
            <ListChecks aria-hidden="true" />
          </div>
          <span className="work-card-content">
            <strong>Tasks</strong>
            <small>Por fazer, em curso, bloqueadas e histórico.</small>
          </span>
        </Link>
        <Link className="intent-card work-square-card" href="/notes">
          <div className="work-card-icon">
            <FileText aria-hidden="true" />
          </div>
          <span className="work-card-content">
            <strong>Notes</strong>
            <small>Documentos Google num único ponto de acesso.</small>
          </span>
        </Link>
      </section>
      <footer className="work-tagline">
        <p className="work-tagline-text">
          Clarity turns intention
          <br />
          into progress.
        </p>
      </footer>
    </main>
  );
}

