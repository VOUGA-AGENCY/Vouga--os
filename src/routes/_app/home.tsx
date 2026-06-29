import { createFileRoute, redirect } from "@tanstack/react-router";

// Página antiga (Plano/Cockpit) descontinuada. Redireciona para os próximos passos.
export const Route = createFileRoute("/_app/home")({
  beforeLoad: () => {
    throw redirect({ to: "/passos" });
  },
});
