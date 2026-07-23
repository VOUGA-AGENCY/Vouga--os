"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  CalendarDays,
  CheckSquare2,
  FilePlus2,
  GanttChartSquare,
  ListTodo,
  Milestone,
  Search,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";

import { flattenNavigation } from "@/foundation/navigation/navigation";
import type { GlobalSearchItem, SearchObjectType } from "@/projections/search/global-search";

import { filterSearchItems, normalizeSearchValue } from "./search";

const typeLabels: Record<SearchObjectType, string> = {
  company: "Organisation",
  contact: "Perfil",
  decision: "Decision",
  meeting: "Meeting",
  roadmap: "Roadmap Item",
  sprint: "Sprint",
  task: "Task",
};

const quickActions = [
  {
    description: "Pessoa e organização",
    href: "/relations/contacts/new",
    title: "Novo perfil",
  },
  {
    description: "Organização e contexto",
    href: "/companies/new",
    title: "New organisation",
  },
  { description: "Propósito, tempo e participantes", href: "/meetings/new", title: "New meeting" },
  { description: "Resultado, owner e prazo", href: "/tasks/new", title: "New task" },
  { description: "Escolha, motivo e impacto", href: "/decisions/new", title: "New decision" },
] as const;

type CommandItem = {
  description: string;
  href: string;
  id: string;
  kind: "action" | "navigation" | "object";
  title: string;
  type?: SearchObjectType;
};

export function CommandPalette({
  isPartial,
  items,
}: {
  isPartial: boolean;
  items: readonly GlobalSearchItem[];
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const commands = useMemo(() => buildCommands(items, query), [items, query]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === "k") {
        event.preventDefault();
        setQuery("");
        setSelectedIndex(0);
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const openPalette = () => {
    setQuery("");
    setSelectedIndex(0);
    setOpen(true);
  };

  const navigate = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <>
      <button
        aria-haspopup="dialog"
        className="command-trigger"
        onClick={openPalette}
        type="button"
      >
        <Search aria-hidden="true" />
        <span>Pesquisar</span>
        <kbd>⌘K</kbd>
      </button>

      <dialog
        aria-labelledby="command-palette-title"
        className="command-dialog"
        onCancel={() => setOpen(false)}
        onClose={() => setOpen(false)}
        ref={dialogRef}
      >
        <div className="command-panel">
          <div className="command-search">
            <Search aria-hidden="true" />
            <label className="sr-only" htmlFor="global-search">
              Pesquisar no Vouga OS
            </label>
            <input
              aria-activedescendant={
                commands[selectedIndex] ? `command-option-${selectedIndex}` : undefined
              }
              aria-controls="command-results"
              aria-expanded="true"
              aria-autocomplete="list"
              autoComplete="off"
              id="global-search"
              onChange={(event) => {
                setQuery(event.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setSelectedIndex((index) => Math.min(index + 1, commands.length - 1));
                }
                if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setSelectedIndex((index) => Math.max(index - 1, 0));
                }
                if (event.key === "Enter" && commands[selectedIndex]) {
                  event.preventDefault();
                  navigate(commands[selectedIndex].href);
                }
              }}
              placeholder="Pesquisar objetos, módulos ou ações…"
              role="combobox"
              value={query}
            />
            <button aria-label="Fechar pesquisa" onClick={() => setOpen(false)} type="button">
              <X aria-hidden="true" />
            </button>
          </div>

          <div className="command-heading">
            <p className="eyebrow" id="command-palette-title">
              Pesquisa global
            </p>
            <span>
              {isPartial ? "Leitura parcial · " : ""}
              {commands.length} resultados
            </span>
          </div>

          <div
            aria-label="Resultados da pesquisa"
            className="command-results"
            id="command-results"
            role="listbox"
          >
            {commands.length === 0 ? (
              <div className="command-empty">
                <strong>Sem correspondências.</strong>
                <span>Experimenta um título, módulo ou tipo de objeto.</span>
              </div>
            ) : (
              commands.map((command, index) => (
                <button
                  aria-selected={index === selectedIndex}
                  className={index === selectedIndex ? "command-result-active" : ""}
                  id={`command-option-${index}`}
                  key={command.id}
                  onClick={() => navigate(command.href)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  role="option"
                  type="button"
                >
                  <CommandIcon command={command} />
                  <span>
                    <strong>{command.title}</strong>
                    <small>{command.description}</small>
                  </span>
                  <em>
                    {command.kind === "object" && command.type
                      ? typeLabels[command.type]
                      : command.kind === "action"
                        ? "New"
                        : "Navegar"}
                  </em>
                </button>
              ))
            )}
          </div>
          <footer className="command-footer">
            <span>↑↓ selecionar</span>
            <span>↵ abrir</span>
            <span>esc fechar</span>
          </footer>
        </div>
      </dialog>
    </>
  );
}

function buildCommands(items: readonly GlobalSearchItem[], query: string): CommandItem[] {
  const normalized = normalizeSearchValue(query);
  const matches = (value: string) =>
    !normalized || normalizeSearchValue(value).includes(normalized);

  const navigation: CommandItem[] = flattenNavigation()
    .filter((item) => matches(`${item.label} ${item.description}`))
    .map((item) => ({
      description: item.description,
      href: item.href,
      id: `navigation:${item.href}`,
      kind: "navigation",
      title: item.label,
    }));
  const actions: CommandItem[] = quickActions
    .filter((item) => matches(`${item.title} ${item.description}`))
    .map((item) => ({
      ...item,
      id: `action:${item.href}`,
      kind: "action",
    }));
  const objects: CommandItem[] = filterSearchItems(items, query).map((item) => ({
    description: item.description,
    href: item.href,
    id: `${item.type}:${item.id}`,
    kind: "object",
    title: item.title,
    type: item.type,
  }));

  return [...actions, ...navigation, ...objects].slice(0, 18);
}

function CommandIcon({ command }: { command: CommandItem }) {
  if (command.kind === "action") return <FilePlus2 aria-hidden="true" />;
  if (command.kind === "navigation") return <Sparkles aria-hidden="true" />;

  const Icon = {
    company: Building2,
    contact: UserRound,
    decision: Milestone,
    meeting: CalendarDays,
    roadmap: GanttChartSquare,
    sprint: ListTodo,
    task: CheckSquare2,
  }[command.type ?? "task"];

  return <Icon aria-hidden="true" />;
}
