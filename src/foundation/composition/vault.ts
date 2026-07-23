import "server-only";

import { VaultService } from "@/application/vault/vault-service";
import { requireVaultSecurityEnv } from "@/foundation/config/vault-env";
import { AesVaultPayloadProtector } from "@/foundation/security/vault-payload-protector";
import { createClient } from "@/persistence/supabase/server";
import { SupabaseVaultRepository } from "@/persistence/vault/supabase-vault-repository";

export async function createVaultModule() {
  const env = requireVaultSecurityEnv();
  const supabase = await createClient();
  return {
    service: new VaultService(
      new SupabaseVaultRepository(supabase),
      new AesVaultPayloadProtector(env.encryptionKey, env.keyVersion),
    ),
  };
}
