import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { Target, Users, FolderKanban, Wallet, Compass, Briefcase, User, Plus, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";

type DockItem = {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  to?: string;
  onClick?: () => void;
  accent?: boolean;
};

// primário: o que importa para já
const PRIMARY: DockItem[] = [
  { key: "home", to: "/home", label: "Plano", icon: Target },
];

// operacional: importante mas não urgente, arrumado
const OPERACIONAL: DockItem[] = [
  { key: "pipeline", to: "/pipeline", label: "Pipeline", icon: Users },
  { key: "engineers", to: "/engineers", label: "Projetos", icon: FolderKanban },
  { key: "financas", to: "/financas", label: "Finanças", icon: Wallet },
  { key: "foundations", to: "/foundations", label: "Casa", icon: Compass },
  { key: "board", to: "/board", label: "Board", icon: Briefcase },
  { key: "personal", to: "/personal", label: "Pessoal", icon: User },
];

const MORPH = "cubic-bezier(0.45,0,0.1,1)"; // easing viscoso

function Dot({ item, path, small }: { item: DockItem; path: string; small?: boolean }) {
  const active = !!item.to && (path === item.to || path.startsWith(item.to + "/"));
  const Icon = item.icon;
  const circle =
    active
      ? "bg-foreground text-background shadow-lg"
      : item.accent
        ? "bg-[#6e7a59] text-white shadow-md"
        : "glass glass-tile text-foreground/70 group-hover/dot:text-foreground";
  const sizeBox = small ? "h-11 w-11" : "h-12 w-12";
  const sizeIcon = small ? "h-[18px] w-[18px]" : "h-5 w-5";

  const inner = (
    <>
      <span
        className={`flex ${sizeBox} items-center justify-center rounded-full group-hover/dot:scale-[1.14] ${circle}`}
        style={{ transition: `transform 500ms ${MORPH}, background-color 400ms ease, color 400ms ease` }}
      >
        <Icon className={sizeIcon} />
      </span>
      <span className="glass pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs text-foreground opacity-0 transition-opacity duration-200 group-hover/dot:opacity-100">
        {item.label}
      </span>
    </>
  );

  return item.to ? (
    <Link to={item.to} className="group/dot relative block">
      {inner}
    </Link>
  ) : (
    <button onClick={item.onClick} aria-label={item.label} className="group/dot relative block">
      {inner}
    </button>
  );
}

export function LeftDock() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { signOut } = useAuth();
  const [open, setOpen] = useState(false);

  const actions: DockItem[] = [
    { key: "novo", label: "Novo", icon: Plus, accent: true, onClick: () => window.dispatchEvent(new Event("vouga:quick-add")) },
    { key: "sair", label: "Terminar sessão", icon: LogOut, onClick: () => signOut() },
  ];

  return (
    <div
      className="fixed bottom-0 left-0 z-40 flex h-28 w-full items-end justify-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {/* dica discreta quando fechado */}
      <div
        className={`pointer-events-none absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-[9px] transition-opacity duration-500 ${
          open ? "opacity-0" : "opacity-100"
        }`}
      >
        {[...PRIMARY, ...OPERACIONAL].map((n) => (
          <span key={n.key} className="h-1.5 w-1.5 rounded-full bg-foreground/25" />
        ))}
      </div>

      {/* dock revelado */}
      <div
        className="relative mb-4 flex items-end gap-7"
        style={{
          transition: `transform 700ms ${MORPH}, opacity 700ms ${MORPH}`,
          transform: open ? "translateY(0)" : "translateY(20px)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
        }}
      >
        {/* primário */}
        <div className="flex items-end gap-0 [&>*:not(:first-child)]:-ml-3">
          {PRIMARY.map((it) => (
            <Dot key={it.key} item={it} path={path} />
          ))}
        </div>
        {/* operacional, arrumado e secundário */}
        <div className="flex items-end gap-0 opacity-80 [&>*:not(:first-child)]:-ml-2">
          {OPERACIONAL.map((it) => (
            <Dot key={it.key} item={it} path={path} small />
          ))}
        </div>
        {/* ações */}
        <div className="flex items-end gap-0 [&>*:not(:first-child)]:-ml-3">
          {actions.map((it) => (
            <Dot key={it.key} item={it} path={path} />
          ))}
        </div>
      </div>
    </div>
  );
}
