import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  GoogleConnectionRepository,
  ProtectedGoogleToken,
  StoredGoogleConnection,
} from "@/application/google/contracts";
import type { GoogleConnection, GoogleConnectionStatus } from "@/domain/google/google-connection";

type GoogleConnectionRow = {
  member_id: string;
  provider_subject: string;
  email: string;
  scopes: string[];
  status: GoogleConnectionStatus;
  refresh_token_ciphertext: string | null;
  refresh_token_iv: string | null;
  token_key_version: number;
  connected_at: string;
  updated_at: string;
  revoked_at: string | null;
};

export class GoogleConnectionPersistenceError extends Error {
  constructor(message = "Não foi possível aceder à ligação Google.") {
    super(message);
    this.name = "GoogleConnectionPersistenceError";
  }
}

export class SupabaseGoogleConnectionRepository implements GoogleConnectionRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findActiveByMemberId(memberId: string): Promise<StoredGoogleConnection | null> {
    const { data, error } = await this.supabase
      .from("google_connections")
      .select(
        "member_id,provider_subject,email,scopes,status,refresh_token_ciphertext,refresh_token_iv,token_key_version,connected_at,updated_at,revoked_at",
      )
      .eq("member_id", memberId)
      .eq("status", "active")
      .maybeSingle();

    if (error) throw new GoogleConnectionPersistenceError();
    if (!data) return null;

    const row = data as GoogleConnectionRow;
    if (!row.refresh_token_ciphertext || !row.refresh_token_iv) {
      throw new GoogleConnectionPersistenceError("A credencial Google guardada está incompleta.");
    }

    return {
      connection: toConnection(row),
      refreshToken: {
        ciphertext: row.refresh_token_ciphertext,
        iv: row.refresh_token_iv,
        keyVersion: row.token_key_version,
      },
    };
  }

  async save(connection: GoogleConnection, refreshToken: ProtectedGoogleToken): Promise<void> {
    const { error } = await this.supabase.from("google_connections").upsert(
      {
        connected_at: connection.connectedAt,
        email: connection.email,
        member_id: connection.memberId,
        provider_subject: connection.providerSubject,
        refresh_token_ciphertext: refreshToken.ciphertext,
        refresh_token_iv: refreshToken.iv,
        revoked_at: null,
        scopes: connection.scopes,
        status: "active",
        token_key_version: refreshToken.keyVersion,
        updated_at: connection.updatedAt,
      },
      { onConflict: "member_id" },
    );

    if (error)
      throw new GoogleConnectionPersistenceError("Não foi possível guardar a ligação Google.");
  }

  async revoke(memberId: string, revokedAt: string): Promise<void> {
    const { error } = await this.supabase
      .from("google_connections")
      .update({
        refresh_token_ciphertext: null,
        refresh_token_iv: null,
        revoked_at: revokedAt,
        status: "revoked",
        updated_at: revokedAt,
      })
      .eq("member_id", memberId);

    if (error)
      throw new GoogleConnectionPersistenceError("Não foi possível remover a ligação Google.");
  }
}

function toConnection(row: GoogleConnectionRow): GoogleConnection {
  return {
    connectedAt: row.connected_at,
    email: row.email,
    memberId: row.member_id,
    providerSubject: row.provider_subject,
    revokedAt: row.revoked_at,
    scopes: row.scopes,
    status: row.status,
    updatedAt: row.updated_at,
  };
}
