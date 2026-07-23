import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  GoogleConnectionReadModel,
  GoogleConnectionSummary,
} from "@/projections/google/google-connection-read-model";

import { GoogleConnectionPersistenceError } from "./supabase-google-connection-repository";

type GoogleConnectionSummaryRow = {
  email: string;
  scopes: string[];
  connected_at: string;
};

export class SupabaseGoogleConnectionReadModel implements GoogleConnectionReadModel {
  constructor(private readonly supabase: SupabaseClient) {}

  async findActiveByMemberId(memberId: string): Promise<GoogleConnectionSummary | null> {
    const { data, error } = await this.supabase
      .from("google_connections")
      .select("email,scopes,connected_at")
      .eq("member_id", memberId)
      .eq("status", "active")
      .maybeSingle();

    if (error) throw new GoogleConnectionPersistenceError();
    if (!data) return null;

    const row = data as GoogleConnectionSummaryRow;
    return { connectedAt: row.connected_at, email: row.email, scopes: row.scopes };
  }
}
