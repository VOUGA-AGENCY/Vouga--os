import {
  Building2,
  CalendarDays,
  FileText,
  ListChecks,
  PanelsTopLeft,
  ShieldCheck,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

import type { UserRole } from "@/application/auth/current-user";

export type NavigationItem = {
  label: string;
  description: string;
  icon: LucideIcon;
  href: string;
  children?: readonly NavigationItem[];
  section?: "primary" | "advanced";
  adminOnly?: boolean;
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
      {
        label: "Projects",
        description: "Entregas acordadas com clientes",
        icon: PanelsTopLeft,
        href: "/projects",
      },
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
    adminOnly: true,
    children: [
      {
        label: "Costs",
        description: "Caixa, runway e pagamentos",
        icon: WalletCards,
        href: "/costs",
      },
    ],
  },
];

export function getVisibleNavigationItems(role: UserRole): NavigationItem[] {
  return navigationItems.filter((item) => !item.adminOnly || role === "admin");
}

export function getVisibleMobileNavigationItems(role: UserRole): NavigationItem[] {
  return getVisibleNavigationItems(role).filter((item) =>
    ["/calendar", "/work", "/relations", "/governance"].includes(item.href)
  );
}

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
