import "server-only";

export type GovernanceSecurityEnv = Readonly<{
  accessKeyHash: string;
  sessionSecret: string;
}>;

export function getGovernanceSecurityEnv(): GovernanceSecurityEnv | null {
  const accessKeyHash = process.env.GOVERNANCE_ACCESS_KEY_HASH?.trim();
  const sessionSecret = process.env.GOVERNANCE_SESSION_SECRET?.trim();

  if (!accessKeyHash || !sessionSecret || sessionSecret.length < 32) return null;
  return { accessKeyHash, sessionSecret };
}

