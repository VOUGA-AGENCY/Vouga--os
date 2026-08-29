"use client";

import { useTransition } from "react";
import { changeUserRoleAction, toggleUserActiveAction } from "./actions";

type MemberRowControlsProps = {
  memberId: string;
  currentRole: "admin" | "engineer";
  currentIsActive: boolean;
  currentUserId: string;
};

export function MemberRowControls({
  memberId,
  currentRole,
  currentIsActive,
  currentUserId,
}: MemberRowControlsProps) {
  const [isPending, startTransition] = useTransition();

  const handleRoleChange = (newRole: "admin" | "engineer") => {
    startTransition(async () => {
      try {
        await changeUserRoleAction(memberId, newRole);
      } catch (err: any) {
        alert(err.message || "Erro ao alterar a função.");
      }
    });
  };

  const handleToggleActive = (isActive: boolean) => {
    startTransition(async () => {
      try {
        await toggleUserActiveAction(memberId, isActive);
      } catch (err: any) {
        alert(err.message || "Erro ao alterar o estado de atividade.");
      }
    });
  };

  const isSelf = memberId === currentUserId;

  return (
    <div className="member-row-controls" style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
      <select
        value={currentRole}
        disabled={isPending}
        onChange={(e) => handleRoleChange(e.target.value as "admin" | "engineer")}
        className="field-select"
        style={{
          padding: "0.25rem 0.5rem",
          borderRadius: "4px",
          border: "1px solid var(--color-border)",
          background: "var(--color-bg)",
          color: "var(--color-text-primary)",
        }}
      >
        <option value="admin">Admin</option>
        <option value="engineer">Engineer</option>
      </select>

      <label style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem" }}>
        <input
          type="checkbox"
          checked={currentIsActive}
          disabled={isPending || isSelf}
          onChange={(e) => handleToggleActive(e.target.checked)}
        />
        <span>{currentIsActive ? "Ativo" : "Inativo"}</span>
      </label>

      {isSelf && <span style={{ fontSize: "0.75rem", color: "var(--color-text-tertiary)" }}>(Tu)</span>}
    </div>
  );
}
