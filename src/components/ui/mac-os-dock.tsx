import React, { useState, useRef, useCallback, useEffect } from "react";

// Dock macOS adaptado à Vouga: magnificação por cosseno, mas paleta creme/vidro
// e símbolos próprios (componentes lucide) em vez de ícones coloridos.
export interface DockApp {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  accent?: boolean;
}

interface MacOSDockProps {
  apps: DockApp[];
  onAppClick: (appId: string) => void;
  openApps?: string[];
  className?: string;
  activeMenuAppId?: string | null;
  renderAppMenu?: (appId: string) => React.ReactNode;
}

const MacOSDock: React.FC<MacOSDockProps> = ({
  apps,
  onAppClick,
  openApps = [],
  className = "",
  activeMenuAppId = null,
  renderAppMenu,
}) => {
  const [mouseX, setMouseX] = useState<number | null>(null);
  const [currentScales, setCurrentScales] = useState<number[]>(apps.map(() => 1));
  const [currentPositions, setCurrentPositions] = useState<number[]>([]);
  const dockRef = useRef<HTMLDivElement>(null);
  const iconRefs = useRef<(HTMLDivElement | null)[]>([]);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const lastMouseMoveTime = useRef<number>(0);

  const getResponsiveConfig = useCallback(() => {
    if (typeof window === "undefined") {
      return { baseIconSize: 56, maxScale: 1.6, effectWidth: 240 };
    }
    const smaller = Math.min(window.innerWidth, window.innerHeight);
    if (smaller < 480) return { baseIconSize: Math.max(38, smaller * 0.075), maxScale: 1.4, effectWidth: smaller * 0.4 };
    if (smaller < 768) return { baseIconSize: Math.max(44, smaller * 0.06), maxScale: 1.5, effectWidth: smaller * 0.35 };
    if (smaller < 1024) return { baseIconSize: Math.max(48, smaller * 0.05), maxScale: 1.55, effectWidth: smaller * 0.3 };
    return { baseIconSize: Math.max(52, Math.min(64, smaller * 0.045)), maxScale: 1.7, effectWidth: 280 };
  }, []);

  const [config, setConfig] = useState(getResponsiveConfig);
  const { baseIconSize, maxScale, effectWidth } = config;
  const minScale = 1.0;
  const baseSpacing = Math.max(4, baseIconSize * 0.1);

  useEffect(() => {
    const handleResize = () => setConfig(getResponsiveConfig());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [getResponsiveConfig]);

  const calculateTargetMagnification = useCallback(
    (mousePosition: number | null) => {
      if (mousePosition === null) return apps.map(() => minScale);
      return apps.map((_, index) => {
        const normalIconCenter = index * (baseIconSize + baseSpacing) + baseIconSize / 2;
        const minX = mousePosition - effectWidth / 2;
        const maxX = mousePosition + effectWidth / 2;
        if (normalIconCenter < minX || normalIconCenter > maxX) return minScale;
        const theta = ((normalIconCenter - minX) / effectWidth) * 2 * Math.PI;
        const cappedTheta = Math.min(Math.max(theta, 0), 2 * Math.PI);
        const scaleFactor = (1 - Math.cos(cappedTheta)) / 2;
        return minScale + scaleFactor * (maxScale - minScale);
      });
    },
    [apps, baseIconSize, baseSpacing, effectWidth, maxScale, minScale],
  );

  const calculatePositions = useCallback(
    (scales: number[]) => {
      let currentX = 0;
      return scales.map((scale) => {
        const scaledWidth = baseIconSize * scale;
        const centerX = currentX + scaledWidth / 2;
        currentX += scaledWidth + baseSpacing;
        return centerX;
      });
    },
    [baseIconSize, baseSpacing],
  );

  useEffect(() => {
    const initialScales = apps.map(() => minScale);
    setCurrentScales(initialScales);
    setCurrentPositions(calculatePositions(initialScales));
  }, [apps, calculatePositions, minScale, config]);

  const animateToTarget = useCallback(() => {
    const targetScales = calculateTargetMagnification(mouseX);
    const targetPositions = calculatePositions(targetScales);
    const lerpFactor = mouseX !== null ? 0.2 : 0.12;
    setCurrentScales((prev) => prev.map((s, i) => s + (targetScales[i] - s) * lerpFactor));
    setCurrentPositions((prev) => prev.map((p, i) => p + (targetPositions[i] - p) * lerpFactor));
    const scalesNeedUpdate = currentScales.some((s, i) => Math.abs(s - targetScales[i]) > 0.002);
    const positionsNeedUpdate = currentPositions.some((p, i) => Math.abs(p - targetPositions[i]) > 0.1);
    if (scalesNeedUpdate || positionsNeedUpdate || mouseX !== null) {
      animationFrameRef.current = requestAnimationFrame(animateToTarget);
    }
  }, [mouseX, calculateTargetMagnification, calculatePositions, currentScales, currentPositions]);

  useEffect(() => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = requestAnimationFrame(animateToTarget);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [animateToTarget]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const now = performance.now();
      if (now - lastMouseMoveTime.current < 16) return;
      lastMouseMoveTime.current = now;
      if (dockRef.current) {
        const rect = dockRef.current.getBoundingClientRect();
        const padding = Math.max(8, baseIconSize * 0.12);
        setMouseX(e.clientX - rect.left - padding);
      }
    },
    [baseIconSize],
  );

  const handleMouseLeave = useCallback(() => setMouseX(null), []);

  const handleAppClick = (appId: string, index: number) => {
    const el = iconRefs.current[index];
    if (el) {
      const bounce = Math.max(-10, -baseIconSize * 0.18);
      el.style.transition = "transform 0.18s ease-out";
      el.style.transform = `translateY(${bounce}px)`;
      setTimeout(() => {
        if (el) el.style.transform = "translateY(0px)";
      }, 180);
    }
    onAppClick(appId);
  };

  const contentWidth =
    currentPositions.length > 0
      ? Math.max(...currentPositions.map((pos, index) => pos + (baseIconSize * currentScales[index]) / 2))
      : apps.length * (baseIconSize + baseSpacing) - baseSpacing;
  const padding = Math.max(8, baseIconSize * 0.12);

  return (
    <div
      ref={dockRef}
      className={`backdrop-blur-xl ${className}`}
      style={{
        width: `${contentWidth + padding * 2}px`,
        background: "rgba(244, 241, 234, 0.55)",
        borderRadius: `${Math.max(16, baseIconSize * 0.42)}px`,
        border: "1px solid rgba(255, 255, 255, 0.6)",
        boxShadow:
          "0 12px 40px -8px rgba(26,24,19,0.22), 0 2px 8px -2px rgba(26,24,19,0.12), inset 0 1px 0 rgba(255,255,255,0.7)",
        padding: `${padding}px`,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="relative" style={{ height: `${baseIconSize}px`, width: "100%" }}>
        {apps.map((app, index) => {
          const scale = currentScales[index] ?? 1;
          const position = currentPositions[index] || 0;
          const scaledSize = baseIconSize * scale;
          const active = openApps.includes(app.id);
          const Icon = app.icon;
          const tileBg = active ? "#1a1813" : app.accent ? "#c97800" : "rgba(255,253,247,0.72)";
          const iconColor = active || app.accent ? "#f1eee6" : "#1a1813";
          return (
            <div
              key={app.id}
              ref={(el) => {
                iconRefs.current[index] = el;
              }}
              data-dock-app-id={app.id}
              className="absolute flex cursor-pointer flex-col items-center justify-end"
              title={app.name}
              onClick={() => handleAppClick(app.id, index)}
              style={{
                left: `${position - scaledSize / 2}px`,
                bottom: "0px",
                width: `${scaledSize}px`,
                height: `${scaledSize}px`,
                transformOrigin: "bottom center",
                zIndex: Math.round(scale * 10),
              }}
            >
              <div
                className="flex items-center justify-center"
                style={{
                  width: `${scaledSize}px`,
                  height: `${scaledSize}px`,
                  borderRadius: `${scaledSize * 0.26}px`,
                  background: tileBg,
                  border: "1px solid rgba(255,255,255,0.5)",
                  boxShadow: `0 ${Math.max(2, scaledSize * 0.04)}px ${Math.max(6, scaledSize * 0.12)}px rgba(26,24,19,${0.12 + (scale - 1) * 0.12})`,
                }}
              >
                <Icon style={{ width: scaledSize * 0.46, height: scaledSize * 0.46, color: iconColor }} />
              </div>

              {active && (
                <div
                  className="absolute"
                  style={{
                    bottom: `${Math.max(-7, -baseIconSize * 0.13)}px`,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: `${Math.max(3, baseIconSize * 0.06)}px`,
                    height: `${Math.max(3, baseIconSize * 0.06)}px`,
                    borderRadius: "50%",
                    backgroundColor: "rgba(26,24,19,0.55)",
                  }}
                />
              )}

              {activeMenuAppId === app.id && renderAppMenu && (
                <div
                  className="absolute left-1/2 z-50 -translate-x-1/2"
                  onClick={(e) => e.stopPropagation()}
                  style={{ bottom: `calc(100% + ${Math.max(6, baseIconSize * 0.1)}px)` }}
                >
                  {renderAppMenu(app.id)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MacOSDock;
