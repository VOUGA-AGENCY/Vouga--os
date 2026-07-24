import {
  Building2,
  CalendarDays,
  CalendarRange,
  FileText,
  Gavel,
  KeyRound,
  Layers3,
  ListChecks,
  Map,
  ShieldCheck,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

export type NavigationItem = {
  label: string;
  description: string;
  icon: LucideIcon;
  href: string;
  children?: readonly NavigationItem[];
  section?: "primary" | "advanced";
};

export const navigationItems: NavigationItem[] = [
  {
    label: "Calendar",
    description: "Tempo, Meetings e compromissos",
    icon: CalendarDays,
    href: "/calendar",
  },
  {
    label: "Work",
    description: "Trabalho diário dos founders",
    icon: ListChecks,
    href: "/work",
    children: [
      { label: "Tasks", description: "Compromissos executáveis", icon: ListChecks, href: "/tasks" },
      { label: "Notes", description: "Documentos e apontamentos", icon: FileText, href: "/notes" },
    ],
  },
  {
    label: "Contacts",
    description: "Pessoas, conversas e organizações",
    icon: Building2,
    href: "/relations",
  },
  {
    label: "Governance",
    description: "Controlo e informação sensível",
    icon: ShieldCheck,
    href: "/governance",
    children: [
      { label: "Costs", description: "Caixa, runway e pagamentos", icon: WalletCards, href: "/costs" },
      { label: "Vault", description: "Credenciais protegidas", icon: KeyRound, href: "/vault" },
    ],
  },
  {
    label: "Advanced",
    description: "Capacidades de planeamento avançado",
    icon: Layers3,
    href: "/advanced",
    section: "advanced",
    children: [
      { label: "Sprints", description: "Ciclos partilhados de compromisso", icon: CalendarRange, href: "/sprints" },
      { label: "Roadmap", description: "Direção estratégica global", icon: Map, href: "/roadmap" },
      { label: "Decisions", description: "Escolhas materiais e histórico", icon: Gavel, href: "/decisions" },
    ],
  },
];

export const mobileNavigationItems = navigationItems.filter((item) =>
  ["/calendar", "/work", "/relations", "/governance"].includes(item.href),
);

export function flattenNavigation(
  items: readonly NavigationItem[] = navigationItems,
): NavigationItem[] {
  return items.flatMap((item) => [item, ...flattenNavigation(item.children ?? [])]);
}

export function isNavigationItemActive(item: NavigationItem, pathname: string): boolean {
  return (
    item.href === pathname ||
    pathname.startsWith(`${item.href}/`) ||
    Boolean(item.children?.some((child) => isNavigationItemActive(child, pathname)))
  );
}
