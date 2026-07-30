"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Ellipsis, Settings, X } from "lucide-react";

import { BrandMark } from "@/foundation/appearance/brand-mark";
import { UserMenu } from "@/foundation/appearance/user-menu";
import { CommandPalette } from "@/foundation/search/command-palette";
import { FeedbackCenter } from "@/foundation/ui/feedback-center";
import type { GlobalSearchItem } from "@/projections/search/global-search";

import {
  isNavigationItemActive,
  mobileNavigationItems,
  navigationItems,
  type NavigationItem,
} from "./navigation";

type AppShellProps = {
  children: React.ReactNode;
  memberLabel: string;
  searchIsPartial: boolean;
  searchItems: readonly GlobalSearchItem[];
};

export function AppShell({ children, memberLabel, searchIsPartial, searchItems }: AppShellProps) {
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

        <DesktopNavigation pathname={pathname} />

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

      <MobileNavigation pathname={pathname} />
      <FeedbackCenter />
    </div>
  );
}

function DesktopNavigation({ pathname }: { pathname: string }) {
  const primary = navigationItems.filter((item) => item.section !== "advanced");
  const advanced = navigationItems.filter((item) => item.section === "advanced");

  return (
    <nav aria-label="Navegação principal" className="sidebar-navigation">
      {primary.map((item) => (
        <DesktopNavigationItem item={item} key={item.href} pathname={pathname} />
      ))}
      <div className="sidebar-navigation-section">
        {advanced.map((item) => (
          <DesktopNavigationItem item={item} key={item.href} pathname={pathname} />
        ))}
      </div>
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

function MobileNavigation({ pathname }: { pathname: string }) {
  return (
    <nav aria-label="Navegação principal" className="bottom-navigation">
      {mobileNavigationItems.map((item) => (
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

function MobileMore({ pathname }: { pathname: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const moreItems = navigationItems.filter((item) =>
    ["/governance", "/advanced"].includes(item.href),
  );
  const active =
    pathname.startsWith("/settings") || moreItems.some((item) => isNavigationItemActive(item, pathname));

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`navigation-item mobile-more-trigger ${active ? "navigation-item-active" : ""}`}
        onClick={() => setOpen(true)}
        type="button"
      >
        <Ellipsis aria-hidden="true" />
        <span>More</span>
      </button>
      <dialog
        aria-labelledby="mobile-more-title"
        className="mobile-more-dialog"
        onCancel={() => setOpen(false)}
        onClose={() => setOpen(false)}
        ref={dialogRef}
      >
        <section className="mobile-more-panel">
          <header>
            <div>
              <h2 id="mobile-more-title">More</h2>
            </div>
            <button aria-label="Fechar menu" onClick={() => setOpen(false)} type="button">
              <X aria-hidden="true" />
            </button>
          </header>
          <div className="mobile-more-groups">
            {moreItems.map((item) => (
              <MobileMoreGroup
                item={item}
                key={item.href}
                onNavigate={() => setOpen(false)}
                pathname={pathname}
              />
            ))}
            <section>
              <Link className="navigation-item" href="/settings" onClick={() => setOpen(false)}>
                <Settings aria-hidden="true" />
                <span>Settings</span>
              </Link>
            </section>
          </div>
        </section>
      </dialog>
    </>
  );
}

function MobileMoreGroup({
  item,
  onNavigate,
  pathname,
}: {
  item: NavigationItem;
  onNavigate: () => void;
  pathname: string;
}) {
  const active = isNavigationItemActive(item, pathname);
  const children = item.children ?? [];
  const hasChildren = children.length > 0;
  const [expanded, setExpanded] = useState<boolean | null>(null);
  const open = expanded ?? active;

  return (
    <section>
      {hasChildren ? (
        <div className="navigation-parent-row">
          <NavigationLink
            item={item}
            onNavigate={() => {
              setExpanded(true);
              onNavigate();
            }}
            pathname={pathname}
          />
          <button
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
        <NavigationLink item={item} onNavigate={onNavigate} pathname={pathname} />
      )}
      {hasChildren ? (
        <div className={`mobile-more-children${open ? " mobile-more-children-open" : ""}`}>
          {children.map((child) => (
            <NavigationLink item={child} key={child.href} onNavigate={onNavigate} pathname={pathname} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
