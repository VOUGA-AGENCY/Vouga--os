"use client";

import Link from "next/link";
import { ChevronDown, LogOut, Settings, UserCircle } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { signOut } from "@/application/auth/actions";

type UserMenuProps = {
  className?: string;
  memberLabel: string;
  variant: "header" | "sidebar";
};

export function UserMenu({ className, memberLabel, variant }: UserMenuProps) {
  const panelId = useId();
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current || !(event.target instanceof Node)) return;
      if (!menuRef.current.contains(event.target)) setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className={`user-menu user-menu-${variant} ${className ?? ""}`} ref={menuRef}>
      <button
        aria-controls={panelId}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`Abrir menu do utilizador: ${memberLabel}`}
        className="user-menu-trigger"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <UserCircle aria-hidden="true" />
        <span className="user-menu-trigger-copy">
          <span className="user-menu-member" title={memberLabel}>
            {memberLabel}
          </span>
        </span>
        <ChevronDown aria-hidden="true" className="user-menu-chevron" />
      </button>

      {open && (
        <div aria-label="Menu do utilizador" className="user-menu-panel" id={panelId} role="dialog">
          <div className="user-menu-identity">
            <span title={memberLabel}>{memberLabel}</span>
          </div>

          <Link className="user-menu-action" href="/settings" onClick={() => setOpen(false)}>
            <Settings aria-hidden="true" />
            <span>Settings & Account</span>
          </Link>

          <form action={signOut}>
            <button className="user-menu-action" type="submit">
              <LogOut aria-hidden="true" />
              <span>Terminar sessão</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
