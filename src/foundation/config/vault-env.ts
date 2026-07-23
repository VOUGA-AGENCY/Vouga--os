import "server-only";

export type VaultSecurityEnv = Readonly<{
  encryptionKey: string;
  keyVersion: number;
}>;

export class VaultConfigurationError extends Error {
  constructor() {
    super("Falta configurar a chave de cifragem do Vault no servidor.");
    this.name = "VaultConfigurationError";
  }
}

export function getVaultSecurityEnv(): VaultSecurityEnv | null {
  const encryptionKey = process.env.VAULT_ENCRYPTION_KEY?.trim();
  const keyVersion = Number(process.env.VAULT_KEY_VERSION ?? "1");
  if (!encryptionKey || !Number.isInteger(keyVersion) || keyVersion < 1) return null;
  try {
    if (Buffer.from(encryptionKey, "base64").byteLength !== 32) return null;
  } catch {
    return null;
  }
  return { encryptionKey, keyVersion };
}

export function requireVaultSecurityEnv(): VaultSecurityEnv {
  const env = getVaultSecurityEnv();
  if (!env) throw new VaultConfigurationError();
  return env;
}
