"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";

import { BrandMark } from "@/foundation/appearance/brand-mark";
import { UserMenu } from "@/foundation/appearance/user-menu";
import { CommandPalette } from "@/foundation/search/command-palette";
import { FeedbackCenter } from "@/foundation/ui/feedback-center";
import type { GlobalSearchItem } from "@/projections/search/global-search";

import type { UserRole } from "@/application/auth/current-user";
import {
  isNavigationItemActive,
  getVisibleNavigationItems,
  getVisibleMobileNavigationItems,
  type NavigationItem,
} from "./navigation";

type AppShellProps = {
  children: React.ReactNode;
  memberLabel: string;
  searchIsPartial: boolean;
  searchItems: readonly GlobalSearchItem[];
  userRole: UserRole;
};

export function AppShell({ children, memberLabel, searchIsPartial, searchItems, userRole }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="app-shell">
      <a className="skip-link" href="#workspace-content">
        Saltar para o conteúdo
      </a>

      <aside aria-label="Workspace Vouga" className="app-sidebar">
        <Link aria-label="Vouga OS — Context Engine" className="app-sidebar-brand" href="/context">
          <Image
            alt="Vouga OS"
            className="app-sidebar-logo"
            height={200}
            priority
            src="/2.png?v=transparent"
            unoptimized
            width={500}
          />
        </Link>

        <DesktopNavigation pathname={pathname} userRole={userRole} />

        <div className="sidebar-member">
          <UserMenu memberLabel={memberLabel} variant="sidebar" />
        </div>
      </aside>

      <div className="workspace-frame">
        <header className="workspace-header">
          <div className="workspace-header-context">
            <Link aria-label="Vouga OS — Context Engine" className="workspace-mobile-mark" href="/context">
              <BrandMark priority />
            </Link>
          </div>

          <div className="workspace-header-actions">
            <CommandPalette isPartial={searchIsPartial} items={searchItems} />
            <span className="workspace-member">{memberLabel}</span>
            <UserMenu className="workspace-user-menu" memberLabel={memberLabel} variant="header" />
          </div>
        </header>

        <div className="workspace-content" id="workspace-content" tabIndex={-1}>
          {children}
        </div>
      </div>

      <MobileNavigation pathname={pathname} userRole={userRole} />
      <FeedbackCenter />
    </div>
  );
}

function DesktopNavigation({ pathname, userRole }: { pathname: string; userRole: UserRole }) {
  const visibleItems = getVisibleNavigationItems(userRole);

  return (
    <nav aria-label="Navegação principal" className="sidebar-navigation">
      {visibleItems.map((item) => (
        <DesktopNavigationItem item={item} key={item.href} pathname={pathname} />
      ))}
    </nav>
  );
}

function DesktopNavigationItem({
  item,
  pathname,
}: {
  item: NavigationItem;
  pathname: string;
}) {
  const active = isNavigationItemActive(item, pathname);
  const children = item.children ?? [];
  const hasChildren = children.length > 0;
  const [expanded, setExpanded] = useState<boolean | null>(null);
  const open = expanded ?? active;

  return (
    <div className={`navigation-group${active ? " navigation-group-active" : ""}`}>
      {hasChildren ? (
        <div className="navigation-parent-row">
          <NavigationLink
            item={item}
            onNavigate={() => setExpanded(true)}
            pathname={pathname}
          />
          <button
            aria-controls={`navigation-children-${item.href.slice(1)}`}
            aria-expanded={open}
            aria-label={`${open ? "Fechar" : "Abrir"} ${item.label}`}
            className="navigation-disclosure"
            onClick={() => setExpanded(!open)}
            type="button"
          >
            <ChevronDown aria-hidden="true" />
          </button>
        </div>
      ) : (
        <NavigationLink item={item} pathname={pathname} />
      )}
      {hasChildren ? (
        <div
          className={`navigation-children${open ? " navigation-children-open" : ""}`}
          id={`navigation-children-${item.href.slice(1)}`}
        >
          {children.map((child) => (
            <NavigationLink item={child} key={child.href} pathname={pathname} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MobileNavigation({ pathname, userRole }: { pathname: string; userRole: UserRole }) {
  const visibleMobileItems = getVisibleMobileNavigationItems(userRole);
  return (
    <nav aria-label="Navegação principal" className="bottom-navigation">
      {visibleMobileItems.map((item) => (
        <NavigationLink item={item} key={item.href} pathname={pathname} />
      ))}
    </nav>
  );
}

function NavigationLink({
  item,
  pathname,
  onNavigate,
}: {
  item: NavigationItem;
  pathname: string;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const active = isNavigationItemActive(item, pathname);
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={`navigation-item ${active ? "navigation-item-active" : ""}`}
      href={item.href}
      onClick={onNavigate}
      title={item.description}
    >
      <Icon aria-hidden="true" />
      <span>{item.label}</span>
    </Link>
  );
}
