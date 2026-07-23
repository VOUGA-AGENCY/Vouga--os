import type {
  GoogleConnectionRepository,
  GoogleOAuthGateway,
  GoogleTokenProtector,
} from "@/application/google/contracts";
import { hasRequiredGoogleDataScopes } from "@/application/google/google-scopes";
import { createGoogleConnection } from "@/domain/google/google-connection";

export class GoogleConnectionApplicationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleConnectionApplicationError";
  }
}

export class GoogleConnectionService {
  constructor(
    private readonly repository: GoogleConnectionRepository,
    private readonly oauth: GoogleOAuthGateway,
    private readonly tokenProtector: GoogleTokenProtector,
    private readonly now: () => Date = () => new Date(),
  ) {}

  createAuthorizationUrl(state: string, loginHint?: string | null): string {
    return this.oauth.createAuthorizationUrl({ loginHint, state });
  }

  async completeAuthorization(memberId: string, code: string): Promise<void> {
    if (!memberId.trim() || !code.trim()) {
      throw new GoogleConnectionApplicationError("O callback Google está incompleto.");
    }

    const tokens = await this.oauth.exchangeAuthorizationCode(code);
    if (!tokens.refreshToken) {
      throw new GoogleConnectionApplicationError(
        "O Google não devolveu acesso offline. Remove o acesso anterior e volta a ligar.",
      );
    }
    if (!hasRequiredGoogleDataScopes(tokens.scopes)) {
      throw new GoogleConnectionApplicationError(
        "A conta Google não concedeu todas as permissões necessárias.",
      );
    }

    const identity = await this.oauth.getIdentity(tokens.accessToken);
    if (!identity.emailVerified) {
      throw new GoogleConnectionApplicationError("O email da conta Google não está verificado.");
    }

    const timestamp = this.now().toISOString();
    const connection = createGoogleConnection({
      email: identity.email,
      memberId,
      now: timestamp,
      providerSubject: identity.subject,
      scopes: tokens.scopes,
    });
    const protectedRefreshToken = await this.tokenProtector.protect(tokens.refreshToken);
    await this.repository.save(connection, protectedRefreshToken);
  }

  async disconnect(memberId: string): Promise<{ remotelyRevoked: boolean }> {
    const stored = await this.repository.findActiveByMemberId(memberId);
    if (!stored) return { remotelyRevoked: true };

    let remotelyRevoked = true;
    try {
      const refreshToken = await this.tokenProtector.reveal(stored.refreshToken);
      await this.oauth.revokeToken(refreshToken);
    } catch {
      remotelyRevoked = false;
    }
    await this.repository.revoke(memberId, this.now().toISOString());

    return { remotelyRevoked };
  }
}

export function getGoogleConnectionErrorMessage(error: unknown): string {
  if (error instanceof GoogleConnectionApplicationError) return error.message;
  return "Não foi possível concluir a ligação ao Google.";
}
