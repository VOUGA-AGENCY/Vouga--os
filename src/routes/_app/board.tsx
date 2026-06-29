import { createFileRoute, redirect } from "@tanstack/react-router";

// Board descontinuado. Comercial → CRM, custos → Finanças.
export const Route = createFileRoute("/_app/board")({
  beforeLoad: () => {
    throw redirect({ to: "/passos" });
  },
});
