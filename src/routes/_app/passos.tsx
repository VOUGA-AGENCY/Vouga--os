import { createFileRoute, redirect } from "@tanstack/react-router";

// Os próximos passos vivem agora dentro de Trabalho (primeiro separador).
export const Route = createFileRoute("/_app/passos")({
  beforeLoad: () => {
    throw redirect({ to: "/engineers" });
  },
});
