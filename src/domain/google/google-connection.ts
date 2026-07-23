export type GoogleConnectionStatus = "active" | "revoked";

export type GoogleConnection = Readonly<{
  memberId: string;
  providerSubject: string;
  email: string;
  scopes: readonly string[];
  status: GoogleConnectionStatus;
  connectedAt: string;
  updatedAt: string;
  revokedAt: string | null;
}>;

export class InvalidGoogleConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidGoogleConnectionError";
  }
}

export function createGoogleConnection(values: {
  memberId: string;
  providerSubject: string;
  email: string;
  scopes: readonly string[];
  now: string;
}): GoogleConnection {
  const memberId = values.memberId.trim();
  const providerSubject = values.providerSubject.trim();
  const email = values.email.trim().toLowerCase();
  const scopes = [...new Set(values.scopes.map((scope) => scope.trim()).filter(Boolean))].sort();

  if (!memberId) throw new InvalidGoogleConnectionError("A ligação precisa de um Member.");
  if (!providerSubject) {
    throw new InvalidGoogleConnectionError("A conta Google não devolveu uma identidade válida.");
  }
  if (!email.includes("@")) {
    throw new InvalidGoogleConnectionError("A conta Google não devolveu um email válido.");
  }
  if (scopes.length === 0) {
    throw new InvalidGoogleConnectionError("A ligação Google não concedeu permissões.");
  }
  if (!Number.isFinite(Date.parse(values.now))) {
    throw new InvalidGoogleConnectionError("A data da ligação Google é inválida.");
  }

  return {
    memberId,
    providerSubject,
    email,
    scopes,
    status: "active",
    connectedAt: values.now,
    updatedAt: values.now,
    revokedAt: null,
  };
}
