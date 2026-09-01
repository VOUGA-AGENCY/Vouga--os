"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Calendar,
  CheckSquare,
  Compass,
  DollarSign,
  ExternalLink,
  Layers,
  Network,
  RotateCcw,
  Sparkles,
  User,
  Workflow,
  X,
  Zap,
} from "lucide-react";

import type { FullContextGraph, GraphEdge, GraphNode, GraphNodeType } from "@/projections/context-engine/context-engine";

const TYPE_CONFIG: Record<
  GraphNodeType,
  { label: string; icon: typeof Building2; color: string; bg: string }
> = {
  company: { label: "Organizações", icon: Building2, color: "#3b82f6", bg: "rgba(59, 130, 246, 0.15)" },
  contact: { label: "Perfis", icon: User, color: "#a855f7", bg: "rgba(168, 85, 247, 0.15)" },
  meeting: { label: "Meetings", icon: Calendar, color: "#ec4899", bg: "rgba(236, 72, 153, 0.15)" },
  task: { label: "Tasks", icon: CheckSquare, color: "#eab308", bg: "rgba(234, 179, 8, 0.15)" },
  sprint: { label: "Sprints", icon: Layers, color: "#10b981", bg: "rgba(16, 185, 129, 0.15)" },
  decision: { label: "Decisions", icon: Zap, color: "#f97316", bg: "rgba(249, 115, 22, 0.15)" },
  cost: { label: "Costs", icon: DollarSign, color: "#ef4444", bg: "rgba(239, 68, 68, 0.15)" },
  roadmap: { label: "Roadmap", icon: Compass, color: "#06b6d4", bg: "rgba(6, 182, 212, 0.15)" },
};

const LAYER_TITLES = [
  "Base (Pessoas & Organizações)",
  "Conversas (Meetings)",
  "Execução (Tasks)",
  "Compromissos (Sprints)",
  "Governação & Custos (Decisions/Costs)",
  "Estratégia (Roadmap)",
];

export function ContextEngineView({ graph }: { graph: FullContextGraph }) {
  const [viewMode, setViewMode] = useState<"graph" | "flow">("graph");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("all");

  const filteredNodes = useMemo(() => {
    if (filterType === "all") return graph.nodes;
    return graph.nodes.filter((n) => n.type === filterType);
  }, [graph.nodes, filterType]);

  const filteredEdges = useMemo(() => {
    const nodeIds = new Set(filteredNodes.map((n) => n.id));
    return graph.edges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));
  }, [graph.edges, filteredNodes]);

  const selectedNode = useMemo(
    () => graph.nodes.find((n) => n.id === selectedNodeId) ?? null,
    [graph.nodes, selectedNodeId],
  );

  const selectedEdges = useMemo(() => {
    if (!selectedNodeId) return [];
    return graph.edges.filter((e) => e.source === selectedNodeId || e.target === selectedNodeId);
  }, [graph.edges, selectedNodeId]);

  const connectedNodeIds = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();
    const set = new Set<string>([selectedNodeId]);
    for (const e of selectedEdges) {
      set.add(e.source);
      set.add(e.target);
    }
    return set;
  }, [selectedNodeId, selectedEdges]);

  return (
    <div className="context-workspace">
      {/* Control Bar */}
      <div className="context-controls-bar">
        <div className="context-mode-switcher" role="tablist">
          <button
            aria-selected={viewMode === "graph"}
            className={`context-tab-button ${viewMode === "graph" ? "active" : ""}`}
            onClick={() => setViewMode("graph")}
            role="tab"
            type="button"
          >
            <Network aria-hidden="true" size={16} />
            <span>Rede Neuronal</span>
          </button>
          <button
            aria-selected={viewMode === "flow"}
            className={`context-tab-button ${viewMode === "flow" ? "active" : ""}`}
            onClick={() => setViewMode("flow")}
            role="tab"
            type="button"
          >
            <Workflow aria-hidden="true" size={16} />
            <span>Fluxo de Contexto</span>
          </button>
        </div>

        {/* Entity Filter Pills */}
        <div className="context-filter-pills">
          <button
            className={`context-filter-pill ${filterType === "all" ? "active" : ""}`}
            onClick={() => setFilterType("all")}
            type="button"
          >
            Todos ({graph.nodes.length})
          </button>
          {(Object.keys(TYPE_CONFIG) as GraphNodeType[]).map((type) => {
            const config = TYPE_CONFIG[type];
            const count = graph.nodes.filter((n) => n.type === type).length;
            if (count === 0) return null;
            return (
              <button
                className={`context-filter-pill ${filterType === type ? "active" : ""}`}
                key={type}
                onClick={() => setFilterType(type)}
                style={
                  filterType === type
                    ? { background: config.bg, borderColor: config.color, color: config.color }
                    : undefined
                }
                type="button"
              >
                <config.icon aria-hidden="true" size={13} />
                <span>{config.label}</span>
                <small>{count}</small>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main View Area */}
      <div className="context-canvas-frame">
        {viewMode === "graph" ? (
          <NeuralGraphView
            connectedNodeIds={connectedNodeIds}
            edges={filteredEdges}
            nodes={filteredNodes}
            onSelectNode={setSelectedNodeId}
            selectedNodeId={selectedNodeId}
          />
        ) : (
          <ContextFlowView
            connectedNodeIds={connectedNodeIds}
            edges={filteredEdges}
            nodes={filteredNodes}
            onSelectNode={setSelectedNodeId}
            selectedNodeId={selectedNodeId}
          />
        )}

        {/* Node Inspector Drawer */}
        {selectedNode && (
          <aside className="context-inspector-drawer">
            <header className="context-inspector-header">
              <div className="context-inspector-title">
                <span
                  className="context-type-badge"
                  style={{
                    background: TYPE_CONFIG[selectedNode.type].bg,
                    color: TYPE_CONFIG[selectedNode.type].color,
                  }}
                >
                  {TYPE_CONFIG[selectedNode.type].label}
                </span>
                <h2>{selectedNode.label}</h2>
                {selectedNode.sublabel && <p>{selectedNode.sublabel}</p>}
              </div>
              <button
                aria-label="Fechar inspetor"
                className="context-close-button"
                onClick={() => setSelectedNodeId(null)}
                type="button"
              >
                <X size={18} />
              </button>
            </header>

            <div className="context-inspector-body">
              <div className="context-inspector-meta">
                {selectedNode.status && (
                  <div className="meta-row">
                    <span>Estado</span>
                    <strong>{selectedNode.status}</strong>
                  </div>
                )}
                <div className="meta-row">
                  <span>Conexões</span>
                  <strong>{selectedNode.connectionsCount} ligações</strong>
                </div>
              </div>

              <div className="context-inspector-relations">
                <h3>Relações Diretas ({selectedEdges.length})</h3>
                {selectedEdges.length === 0 ? (
                  <p className="muted-copy">Sem relações diretas registadas.</p>
                ) : (
                  <ul className="context-relation-list">
                    {selectedEdges.map((edge) => {
                      const otherId = edge.source === selectedNodeId ? edge.target : edge.source;
                      const otherNode = graph.nodes.find((n) => n.id === otherId);
                      if (!otherNode) return null;
                      const Icon = TYPE_CONFIG[otherNode.type].icon;
                      return (
                        <li key={edge.id}>
                          <button
                            className="context-relation-item"
                            onClick={() => setSelectedNodeId(otherNode.id)}
                            type="button"
                          >
                            <Icon
                              size={14}
                              style={{ color: TYPE_CONFIG[otherNode.type].color }}
                            />
                            <span>{otherNode.label}</span>
                            <small>{edge.relation}</small>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="context-inspector-actions">
                <Link className="button-primary" href={selectedNode.href}>
                  Abrir {TYPE_CONFIG[selectedNode.type].label.slice(0, -1)} <ExternalLink size={14} />
                </Link>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

function NeuralGraphView({
  connectedNodeIds,
  edges,
  nodes,
  onSelectNode,
  selectedNodeId,
}: {
  connectedNodeIds: Set<string>;
  edges: readonly GraphEdge[];
  nodes: readonly GraphNode[];
  onSelectNode: (id: string | null) => void;
  selectedNodeId: string | null;
}) {
  const [zoom, setZoom] = useState(1);

  // Position nodes in organic concentric clusters based on layer and index
  const positionedNodes = useMemo(() => {
    const layerGroups: Record<number, GraphNode[]> = {};
    for (const node of nodes) {
      if (!layerGroups[node.layer]) layerGroups[node.layer] = [];
      layerGroups[node.layer].push(node);
    }

    const result: Array<GraphNode & { x: number; y: number }> = [];
    const centerX = 500;
    const centerY = 350;

    Object.keys(layerGroups).forEach((layerStr) => {
      const layer = Number(layerStr);
      const group = layerGroups[layer];
      const radius = 90 + layer * 70;
      const angleStep = (2 * Math.PI) / group.length;

      group.forEach((node, i) => {
        const angle = i * angleStep + layer * 0.4;
        const jitterX = Math.sin(i * 3 + layer) * 20;
        const jitterY = Math.cos(i * 2 + layer) * 20;
        const rawX = centerX + radius * Math.cos(angle) + jitterX;
        const rawY = centerY + radius * Math.sin(angle) + jitterY;
        result.push({
          ...node,
          x: Math.round(rawX * 100) / 100,
          y: Math.round(rawY * 100) / 100,
        });
      });
    });

    return result;
  }, [nodes]);

  const posMap = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    for (const n of positionedNodes) map.set(n.id, { x: n.x, y: n.y });
    return map;
  }, [positionedNodes]);

  return (
    <div className="neural-graph-container">
      <div className="graph-zoom-controls">
        <button onClick={() => setZoom((z) => Math.min(z + 0.15, 1.8))} type="button">+</button>
        <button onClick={() => setZoom((z) => Math.max(z - 0.15, 0.5))} type="button">−</button>
        <button onClick={() => { setZoom(1); onSelectNode(null); }} type="button">
          <RotateCcw size={13} />
        </button>
      </div>

      <svg
        className="neural-svg"
        onClick={(e) => {
          if (e.target === e.currentTarget) onSelectNode(null);
        }}
        viewBox="0 0 1000 700"
      >
        <defs>
          <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
        </defs>

        <g style={{ transformOrigin: "500px 350px" }} transform={`scale(${zoom})`}>
          {/* Edges */}
          {edges.map((edge) => {
            const p1 = posMap.get(edge.source);
            const p2 = posMap.get(edge.target);
            if (!p1 || !p2) return null;

            const isHighlighted =
              selectedNodeId &&
              (edge.source === selectedNodeId || edge.target === selectedNodeId);
            const isDimmed = selectedNodeId && !isHighlighted;

            return (
              <line
                className={`graph-edge-line ${isHighlighted ? "highlighted" : ""} ${isDimmed ? "dimmed" : ""}`}
                key={edge.id}
                x1={p1.x}
                x2={p2.x}
                y1={p1.y}
                y2={p2.y}
              />
            );
          })}

          {/* Nodes */}
          {positionedNodes.map((node) => {
            const isSelected = selectedNodeId === node.id;
            const isConnected = connectedNodeIds.has(node.id);
            const isDimmed = selectedNodeId && !isConnected;
            const config = TYPE_CONFIG[node.type];
            const nodeRadius = 14 + Math.min(node.connectionsCount * 2.5, 16);

            return (
              <g
                className={`graph-node-group ${isSelected ? "selected" : ""} ${isDimmed ? "dimmed" : ""}`}
                key={node.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectNode(node.id);
                }}
                transform={`translate(${node.x}, ${node.y})`}
              >
                {/* Glow ring on selection */}
                {(isSelected || isConnected) && (
                  <circle
                    className="graph-node-pulse"
                    r={nodeRadius + 8}
                    style={{ stroke: config.color }}
                  />
                )}
                {/* Main Node Circle */}
                <circle
                  className="graph-node-circle"
                  r={nodeRadius}
                  style={{ fill: config.color }}
                />
                {/* Node Label */}
                <text
                  className="graph-node-label"
                  dy={nodeRadius + 14}
                  textAnchor="middle"
                >
                  {node.label.length > 18 ? `${node.label.slice(0, 16)}…` : node.label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

function ContextFlowView({
  connectedNodeIds,
  edges,
  nodes,
  onSelectNode,
  selectedNodeId,
}: {
  connectedNodeIds: Set<string>;
  edges: readonly GraphEdge[];
  nodes: readonly GraphNode[];
  onSelectNode: (id: string | null) => void;
  selectedNodeId: string | null;
}) {
  const layers = useMemo(() => {
    const result: Array<{ index: number; title: string; nodes: GraphNode[] }> = [];
    for (let i = 0; i < LAYER_TITLES.length; i++) {
      result.push({
        index: i,
        title: LAYER_TITLES[i],
        nodes: nodes.filter((n) => n.layer === i),
      });
    }
    return result;
  }, [nodes]);

  return (
    <div className="context-flow-container">
      <div className="flow-columns">
        {layers.map((layer) => (
          <div className="flow-column" key={layer.index}>
            <header className="flow-column-header">
              <span className="flow-column-step">0{layer.index + 1}</span>
              <h4>{layer.title}</h4>
            </header>
            <div className="flow-column-nodes">
              {layer.nodes.length === 0 ? (
                <div className="flow-empty-box">Sem registos</div>
              ) : (
                layer.nodes.map((node) => {
                  const isSelected = selectedNodeId === node.id;
                  const isConnected = connectedNodeIds.has(node.id);
                  const isDimmed = selectedNodeId && !isConnected;
                  const config = TYPE_CONFIG[node.type];
                  const Icon = config.icon;

                  return (
                    <div
                      className={`flow-node-card ${isSelected ? "selected" : ""} ${isConnected ? "connected" : ""} ${isDimmed ? "dimmed" : ""}`}
                      key={node.id}
                      onClick={() => onSelectNode(node.id)}
                      style={{ borderLeftColor: config.color }}
                    >
                      <div className="flow-card-head">
                        <Icon size={14} style={{ color: config.color }} />
                        <strong>{node.label}</strong>
                      </div>
                      {node.sublabel && <small className="muted-copy">{node.sublabel}</small>}
                      <span className="flow-card-badge">{node.connectionsCount} ligações</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
