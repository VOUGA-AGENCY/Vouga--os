"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function GovernanceProtectedSurface({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [concealed, setConcealed] = useState(false);
  const enabled = pathname !== "/governance/locked";

  useEffect(() => {
    if (!enabled) return;

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        setConcealed(true);
        void fetch("/api/governance/lock", { keepalive: true, method: "POST" });
        return;
      }
      if (concealed) window.location.reload();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [concealed, enabled]);

  return (
    <div className={concealed ? "governance-surface-concealed" : undefined}>
      {children}
      {concealed ? <div aria-label="Governance bloqueada" className="governance-concealment" /> : null}
    </div>
  );
}

