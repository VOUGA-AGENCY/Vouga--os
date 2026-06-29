import { useEffect, useState } from "react";
import Aurora from "@/components/Aurora";

/**
 * Fundo vivo do Vouga OS: base creme quente com manchas clay/sage e uma
 * camada Aurora subtil por trás do vidro. Client-only (Aurora usa WebGL).
 */
export function AppBackground() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 12% 8%, rgba(160,106,74,0.20), transparent 55%)," +
            "radial-gradient(120% 100% at 92% 18%, rgba(110,122,89,0.18), transparent 55%)," +
            "radial-gradient(140% 120% at 50% 110%, rgba(160,106,74,0.14), transparent 60%)," +
            "#efe9df",
        }}
      />
      {mounted && (
        <div className="absolute inset-0 opacity-[0.55] mix-blend-soft-light">
          <Aurora colorStops={["#b98b63", "#dcd7ca", "#7f8a63"]} amplitude={0.9} blend={0.65} speed={0.5} />
        </div>
      )}
      {/* grão / vinheta suave para o vidro ter o que refratar */}
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(130% 130% at 50% 0%, transparent 60%, rgba(26,24,19,0.06))" }}
      />
    </div>
  );
}
