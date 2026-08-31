import type { UserRole } from "@/application/auth/current-user";

export function canManageGoogle(role: UserRole): boolean {
  return role === "admin";
}
