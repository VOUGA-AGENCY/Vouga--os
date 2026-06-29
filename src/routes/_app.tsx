import { createFileRoute, Outlet, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { VougaDock } from "@/components/VougaDock";
import mark from "@/assets/vouga-mark.png";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login", replace: true });
    }
  }, [loading, user, profile, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-xs text-muted-foreground">A carregar…</p>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-background">
      {/* marca: clicar volta ao Trabalho */}
      <Link to="/hoje" className="fixed left-4 top-4 z-50 flex items-center gap-2 transition-opacity hover:opacity-70 sm:left-5 sm:top-5 sm:gap-2.5">
        <img src={mark} alt="Vouga" className="h-6 w-6 sm:h-7 sm:w-7" />
        <span className="font-serif text-lg leading-none sm:text-xl">Vouga OS</span>
      </Link>

      {/* navegação: dock estilo macOS no fundo */}
      <VougaDock />

      {/* conteúdo é a página */}
      <main className="h-full overflow-y-auto">
        <div className="mx-auto max-w-4xl px-4 pb-28 pt-20 sm:px-8 sm:pb-32 sm:pt-24">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
