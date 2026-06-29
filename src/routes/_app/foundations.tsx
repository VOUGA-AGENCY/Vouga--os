import { createFileRoute, redirect } from "@tanstack/react-router";

// Página antiga (Casa) descontinuada. O conteúdo vive agora em "O que fazemos".
export const Route = createFileRoute("/_app/foundations")({
  beforeLoad: () => {
    throw redirect({ to: "/sobre" });
  },
});
