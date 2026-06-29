import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Users, FolderKanban, Wallet, Compass, User, LogOut, Search, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import logo from "@/assets/vouga-mark.png";

type Item = { to: string; label: string; icon: React.ComponentType<{ className?: string }> };

const groups: { heading: string; items: Item[] }[] = [
  {
    heading: "dia a dia",
    items: [
      { to: "/home", label: "Cockpit", icon: LayoutDashboard },
      { to: "/pipeline", label: "Pipeline", icon: Users },
      { to: "/engineers", label: "Projetos", icon: FolderKanban },
    ],
  },
  {
    heading: "gestão",
    items: [
      { to: "/financas", label: "Finanças", icon: Wallet },
      { to: "/foundations", label: "Casa", icon: Compass },
      { to: "/personal", label: "Pessoal", icon: User },
    ],
  },
];

function initials(name?: string | null) {
  if (!name) return "V";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "V";
}

export function AppSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { profile, role, signOut } = useAuth();

  const openSearch = () => window.dispatchEvent(new Event("kind:open-cmdk"));
  const openNew = () => window.dispatchEvent(new Event("vouga:quick-add"));

  return (
    <div className="flex h-full w-64 flex-col gap-3">
      {/* módulo: marca + procurar */}
      <div className="glass rounded-3xl p-3">
        <div className="flex items-center gap-2.5 px-1.5 pb-3 pt-1">
          <img src={logo} alt="Vouga" className="h-7 w-7" />
          <span className="font-serif text-2xl leading-none text-foreground">Vouga OS</span>
        </div>
        <button
          onClick={openSearch}
          className="glass-tile relative z-[1] flex w-full items-center gap-2 rounded-xl border border-white/50 bg-white/40 px-3 py-2 text-xs text-muted-foreground hover:bg-white/60"
        >
          <Search className="h-3.5 w-3.5" />
          Procurar
          <kbd className="ml-auto rounded bg-foreground/10 px-1.5 py-0.5 font-mono text-[10px] text-foreground/70">⌘K</kbd>
        </button>
      </div>

      {/* módulo: navegação */}
      <nav className="glass relative z-[1] flex-1 space-y-5 overflow-y-auto rounded-3xl p-3">
        {groups.map((g) => (
          <div key={g.heading}>
            <p className="px-2 pb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
              {g.heading}
            </p>
            <div className="space-y-1">
              {g.items.map((it) => {
                const active = path === it.to || path.startsWith(it.to + "/");
                const Icon = it.icon;
                return (
                  <Link
                    key={it.to}
                    to={it.to}
                    className={`glass-tile flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${
                      active
                        ? "bg-[#a06a4a] text-white shadow-[0_6px_16px_-6px_rgba(160,106,74,0.7)]"
                        : "text-foreground/75 hover:bg-white/55 hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {it.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* módulo: novo + utilizador */}
      <div className="glass relative z-[1] space-y-3 rounded-3xl p-3">
        <button
          onClick={openNew}
          className="glass-tile flex w-full items-center justify-center gap-2 rounded-xl bg-[#a06a4a] px-3 py-2.5 text-sm font-medium text-white hover:bg-[#8c5b3f]"
        >
          <Plus className="h-4 w-4" />
          Novo
        </button>
        <div className="flex items-center gap-3 px-1">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#6e7a59] font-mono text-xs text-white">
            {initials(profile?.full_name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-foreground">{profile?.full_name ?? "sem nome"}</p>
            <p className="truncate text-[11px] text-muted-foreground">{role === "admin" ? "Admin" : "Equipa"}</p>
          </div>
          <button
            onClick={() => signOut()}
            aria-label="Terminar sessão"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-white/55 hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
