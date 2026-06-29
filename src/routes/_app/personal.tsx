import { createFileRoute, redirect } from "@tanstack/react-router";

// Espaço pessoal descontinuado. As notas vivem agora dentro de cada passo/tarefa.
export const Route = createFileRoute("/_app/personal")({
  beforeLoad: () => {
    throw redirect({ to: "/passos" });
  },
});
