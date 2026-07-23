import "server-only";

export type GoogleOAuthEnv = Readonly<{
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  tokenEncryptionKey: string;
}>;

export class GoogleConfigurationError extends Error {
  constructor() {
    super("A integração Google ainda não está configurada.");
    this.name = "GoogleConfigurationError";
  }
}

export function getGoogleOAuthEnv(): GoogleOAuthEnv | null {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim();
  const tokenEncryptionKey = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY?.trim();

  if (!clientId || !clientSecret || !redirectUri || !tokenEncryptionKey) return null;
  if (!isValidRedirectUri(redirectUri) || !isValidEncryptionKey(tokenEncryptionKey)) return null;

  return { clientId, clientSecret, redirectUri, tokenEncryptionKey };
}

export function requireGoogleOAuthEnv(): GoogleOAuthEnv {
  const env = getGoogleOAuthEnv();
  if (!env) throw new GoogleConfigurationError();
  return env;
}

function isValidRedirectUri(value: string): boolean {
  try {
    const url = new URL(value);
    const localHttp = url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
    return url.protocol === "https:" || localHttp;
  } catch {
    return false;
  }
}

function isValidEncryptionKey(value: string): boolean {
  try {
    return Buffer.from(value, "base64").byteLength === 32;
  } catch {
    return false;
  }
}
