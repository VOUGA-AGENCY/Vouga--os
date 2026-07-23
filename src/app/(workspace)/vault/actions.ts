"use server";

import { unstable_noStore as noStore, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireGovernanceAccess } from "@/application/governance/require-governance-access";
import { getVaultApplicationErrorMessage } from "@/application/vault/vault-service";
import { createVaultModule } from "@/foundation/composition/vault";
import { withFeedback } from "@/foundation/ui/feedback";

export type VaultFormState = { message: string | null };
export type VaultRevealState =
  | {
      ok: true;
      secret: { username: string; password: string; note: string | null };
    }
  | { ok: false; message: string };

export async function createVaultEntryAction(
  _previousState: VaultFormState,
  form: FormData,
): Promise<VaultFormState> {
  try {
    await requireGovernanceAccess("/vault/new");
    const { service } = await createVaultModule();
    await service.createEntry({
      serviceName: String(form.get("service_name") ?? ""),
      url: String(form.get("url") ?? ""),
      username: String(form.get("username") ?? ""),
      password: String(form.get("password") ?? ""),
      note: String(form.get("note") ?? ""),
    });
    revalidatePath("/vault");
    redirect(withFeedback("/vault", "Credencial guardada."));
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    return { message: getVaultApplicationErrorMessage(error) };
  }
}

export async function revealVaultEntryAction(id: string): Promise<VaultRevealState> {
  noStore();
  try {
    await requireGovernanceAccess("/vault");
    const { service } = await createVaultModule();
    return { ok: true, secret: await service.revealEntry(id) };
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    return { ok: false, message: getVaultApplicationErrorMessage(error) };
  }
}

export async function deleteVaultEntryAction(id: string): Promise<void> {
  await requireGovernanceAccess("/vault");
  try {
    const { service } = await createVaultModule();
    await service.deleteEntry(id);
  } catch (error) {
    redirect(withFeedback("/vault", getVaultApplicationErrorMessage(error)));
  }
  revalidatePath("/vault");
  redirect(withFeedback("/vault", "Credencial eliminada."));
}
