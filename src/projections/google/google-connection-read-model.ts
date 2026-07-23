export type GoogleConnectionSummary = Readonly<{
  email: string;
  scopes: readonly string[];
  connectedAt: string;
}>;

export interface GoogleConnectionReadModel {
  findActiveByMemberId(memberId: string): Promise<GoogleConnectionSummary | null>;
}
