import type {
  GoogleConnectionRepository,
  GoogleDriveDocument,
  GoogleDriveDocumentGateway,
  GoogleOAuthGateway,
  GoogleTokenProtector,
} from "./contracts";

export class GoogleDriveDocumentError extends Error {
  constructor(message = "Não foi possível carregar os documentos Google.") {
    super(message);
    this.name = "GoogleDriveDocumentError";
  }
}

export class GoogleDriveDocumentService {
  constructor(
    private readonly connectionRepository: GoogleConnectionRepository,
    private readonly oauth: GoogleOAuthGateway,
    private readonly documents: GoogleDriveDocumentGateway,
    private readonly tokenProtector: GoogleTokenProtector,
  ) {}

  async createDocument(memberId: string, title: string): Promise<GoogleDriveDocument> {
    const accessToken = await this.accessToken(memberId);
    const normalizedTitle = title.trim();
    if (!normalizedTitle) throw new GoogleDriveDocumentError("Dá um título ao documento.");
    if (normalizedTitle.length > 180) {
      throw new GoogleDriveDocumentError("O título do documento é demasiado longo.");
    }
    return this.documents.createDocument(accessToken, normalizedTitle);
  }

  async listDocuments(memberId: string, query: string | null): Promise<GoogleDriveDocument[]> {
    const accessToken = await this.accessToken(memberId);
    return this.documents.listDocuments(accessToken, query?.trim() || null);
  }

  private async accessToken(memberId: string): Promise<string> {
    const stored = await this.connectionRepository.findActiveByMemberId(memberId);
    if (!stored) throw new GoogleDriveDocumentError("Liga primeiro uma conta Google.");

    try {
      const refreshToken = await this.tokenProtector.reveal(stored.refreshToken);
      return await this.oauth.refreshAccessToken(refreshToken);
    } catch {
      throw new GoogleDriveDocumentError();
    }
  }
}

export function getGoogleDriveDocumentErrorMessage(error: unknown): string {
  if (error instanceof GoogleDriveDocumentError) return error.message;
  return "Não foi possível carregar os documentos Google.";
}
