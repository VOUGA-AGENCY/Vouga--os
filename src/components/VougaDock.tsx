import { useEffect, useRef, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import {
  BookOpen, ListChecks, Calendar, FolderKanban, Wallet, Users,
  Plus, LogOut, FileText, Flag, Receipt, UserPlus, Sunrise,
} from "lucide-react";
import MacOSDock, { type DockApp } from "@/components/ui/mac-os-dock";

const APPS: DockApp[] = [
  { id: "/hoje", name: "Hoje", icon: Sunrise },
  { id: "/sobre", name: "VOUGA", icon: BookOpen },
  { id: "/engineers", name: "Trabalho", icon: FolderKanban },
  { id: "/calendario", name: "Calendário", icon: Calendar },
  { id: "/pipeline", name: "CRM", icon: Users },
  { id: "/financas", name: "Finanças", icon: Wallet },
  { id: "novo", name: "Criar", icon: Plus, accent: true },
  { id: "sair", name: "Terminar sessão", icon: LogOut },
];

type CreateOption = { label: string; to: string; icon: React.ComponentType<{ className?: string }> };
const CREATE: CreateOption[] = [
  { label: "Próximo passo", to: "/engineers", icon: ListChecks },
  { label: "Evento", to: "/calendario", icon: Calendar },
  { label: "Documento", to: "/engineers", icon: FileText },
  { label: "Milestone", to: "/engineers", icon: Flag },
  { label: "Lead", to: "/pipeline", icon: UserPlus },
  { label: "Custo", to: "/financas", icon: Receipt },
];

export function VougaDock() {
  const navigate = useNavigate();
  const go = navigate as unknown as (o: { to: string }) => void;
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [touchNav, setTouchNav] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => setTouchNav(window.matchMedia("(pointer: coarse), (max-width: 767px)").matches);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const closeMenu = () => { setMenu(false); setOpen(false); };

  const onAppClick = (id: string) => {
    if (id === "novo") { menu ? closeMenu() : setMenu(true); }
    else if (id === "sair") signOut();
    else { setMenu(false); go({ to: id }); }
  };

  const openApps = APPS.filter((a) => a.id.startsWith("/") && (path === a.id || path.startsWith(a.id + "/"))).map((a) => a.id);

  const createMenu = () => (
    <div className="glass w-52 rounded-2xl p-1.5 shadow-2xl">
      <p className="vouga-label px-2.5 pb-1 pt-1.5">Criar</p>
      {CREATE.map((c) => {
        const Icon = c.icon;
        return (
          <button
            key={c.label}
            onClick={() => { closeMenu(); go({ to: c.to }); }}
            className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm text-foreground/80 transition-colors hover:bg-white/55 hover:text-foreground"
          >
            <Icon className="h-4 w-4 text-[var(--ring)]" />
            {c.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <>
      {menu && <div className="fixed inset-0 z-30" onClick={closeMenu} />}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center">
        <div
          ref={wrapRef}
          className="pointer-events-auto flex max-w-full flex-col items-center px-2 pb-2 sm:pb-4"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => { if (!menu) setOpen(false); }}
        >
          <div
            style={{
              transition: "transform 450ms cubic-bezier(0.22,1,0.36,1), opacity 450ms cubic-bezier(0.22,1,0.36,1)",
              transform: open || menu || touchNav ? "translateY(0)" : "translateY(calc(100% + 32px))",
              opacity: open || menu || touchNav ? 1 : 0,
            }}
          >
            <MacOSDock
              apps={APPS}
              onAppClick={onAppClick}
              openApps={openApps}
              activeMenuAppId={menu ? "novo" : null}
              renderAppMenu={createMenu}
            />
          </div>
          <div className={`mt-2 h-1.5 w-12 rounded-full bg-foreground/25 transition-opacity duration-300 ${open || menu || touchNav ? "opacity-0" : "opacity-100"}`} />
        </div>
      </div>
    </>
  );
}
