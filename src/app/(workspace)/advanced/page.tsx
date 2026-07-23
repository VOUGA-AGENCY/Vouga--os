import Link from "next/link";
import { CalendarRange, Gavel, Map } from "lucide-react";

const areas = [
  { href: "/sprints", icon: CalendarRange, label: "Sprints", description: "Ciclos partilhados de compromisso." },
  { href: "/roadmap", icon: Map, label: "Roadmap", description: "Direção estratégica em Now, Next e Later." },
  { href: "/decisions", icon: Gavel, label: "Decisions", description: "Escolhas materiais e respetivo histórico." },
] as const;

export default function AdvancedPage() {
  return (
    <main className="workspace-main module-main intent-page">
      <div className="module-heading">
        <div>
          <h1 className="display">Advanced</h1>
          <p className="workspace-intro">Planeamento e histórico.</p>
        </div>
      </div>
      <section aria-label="Áreas Advanced" className="intent-grid intent-grid-three">
        {areas.map(({ href, icon: Icon, label, description }) => (
          <Link className="intent-card" href={href} key={href}>
            <Icon aria-hidden="true" />
            <span><strong>{label}</strong><small>{description}</small></span>
          </Link>
        ))}
      </section>
    </main>
  );
}
