import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreateNoteItem, NoteRepository } from "@/application/notes/contracts";
import { NoteApplicationError, NoteConflictError } from "@/application/notes/note-service";
import type { NoteFolder, NoteFolderColor, NoteItem, NoteKind } from "@/domain/notes/note";

type FolderRow = {
  id: string;
  name: string;
  color: NoteFolderColor;
  created_at: string;
  updated_at: string;
};

type ItemRow = {
  id: string;
  folder_id: string | null;
  kind: NoteKind;
  title: string;
  body: string | null;
  google_document_id: string | null;
  google_html_link: string | null;
  google_owner_member_id: string | null;
  google_revision_id: string | null;
  google_modified_at: string | null;
  storage_path: string | null;
  original_file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  version: number;
  created_at: string;
  updated_at: string;
};

const ITEM_COLUMNS = "id,folder_id,kind,title,body,google_document_id,google_html_link,google_owner_member_id,google_revision_id,google_modified_at,storage_path,original_file_name,mime_type,size_bytes,version,created_at,updated_at";

export class SupabaseNoteRepository implements NoteRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async listFolders(): Promise<NoteFolder[]> {
    const { data, error } = await this.supabase
      .from("note_folders")
      .select("id,name,color,created_at,updated_at")
      .order("created_at");
    if (error) throw new NoteApplicationError("A estrutura de pastas ainda não está disponível.");
    return (data as FolderRow[]).map(toFolder);
  }

  async listItems(): Promise<NoteItem[]> {
    const { data, error } = await this.supabase
      .from("note_items")
      .select(ITEM_COLUMNS)
      .order("updated_at", { ascending: false });
    if (error) throw new NoteApplicationError("A estrutura de Notes ainda não está disponível.");
    return (data as ItemRow[]).map(toItem);
  }

  async findItem(id: string): Promise<NoteItem | null> {
    const { data, error } = await this.supabase
      .from("note_items")
      .select(ITEM_COLUMNS)
      .eq("id", id)
      .maybeSingle();
    if (error) throw new NoteApplicationError("Não foi possível abrir a nota.");
    return data ? toItem(data as ItemRow) : null;
  }

  async createFolder(values: { id: string; name: string; color: NoteFolderColor; memberId: string }) {
    const { error } = await this.supabase.from("note_folders").insert({
      color: values.color,
      created_by_member_id: values.memberId,
      id: values.id,
      name: values.name,
    });
    if (error) throw new NoteApplicationError("Não foi possível criar a pasta.");
  }

  async createItem(values: CreateNoteItem): Promise<void> {
    const { error } = await this.supabase.from("note_items").insert({
      body: values.body,
      created_by_member_id: values.memberId,
      folder_id: values.folderId,
      google_document_id: values.googleDocumentId ?? null,
      google_html_link: values.googleHtmlLink ?? null,
      google_modified_at: values.googleModifiedAt ?? null,
      google_owner_member_id: values.googleOwnerMemberId ?? null,
      google_revision_id: values.googleRevisionId ?? null,
      id: values.id,
      kind: values.kind,
      mime_type: values.mimeType ?? null,
      original_file_name: values.originalFileName ?? null,
      size_bytes: values.sizeBytes ?? null,
      storage_path: values.storagePath ?? null,
      title: values.title,
      updated_by_member_id: values.memberId,
    });
    if (error) throw new NoteApplicationError("Não foi possível criar a nota.");
  }

  async updateFolder(id: string, values: { name?: string; color?: NoteFolderColor }): Promise<void> {
    const { error } = await this.supabase
      .from("note_folders")
      .update({ ...values, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new NoteApplicationError("Não foi possível atualizar a pasta.");
  }

  async updateItem(values: {
    id: string;
    memberId: string;
    title: string;
    body: string;
    expectedVersion: number;
    folderId?: string | null;
    googleRevisionId?: string | null;
    googleModifiedAt?: string | null;
  }): Promise<NoteItem> {
    const payload: Record<string, unknown> = {
      body: values.body,
      title: values.title,
      updated_at: new Date().toISOString(),
      updated_by_member_id: values.memberId,
      version: values.expectedVersion + 1,
    };
    if (values.googleRevisionId !== undefined) payload.google_revision_id = values.googleRevisionId;
    if (values.googleModifiedAt !== undefined) payload.google_modified_at = values.googleModifiedAt;
    if (values.folderId !== undefined) payload.folder_id = values.folderId;
    const { data, error } = await this.supabase
      .from("note_items")
      .update(payload)
      .eq("id", values.id)
      .eq("version", values.expectedVersion)
      .select(ITEM_COLUMNS)
      .maybeSingle();
    if (error) throw new NoteApplicationError("Não foi possível guardar a nota.");
    if (!data) throw new NoteConflictError();
    return toItem(data as ItemRow);
  }

  async updateItemMetadata(values: {
    id: string;
    memberId: string;
    title: string;
    folderId: string | null;
    expectedVersion: number;
  }): Promise<NoteItem> {
    const { data, error } = await this.supabase
      .from("note_items")
      .update({
        folder_id: values.folderId,
        title: values.title,
        updated_at: new Date().toISOString(),
        updated_by_member_id: values.memberId,
        version: values.expectedVersion + 1,
      })
      .eq("id", values.id)
      .eq("version", values.expectedVersion)
      .select(ITEM_COLUMNS)
      .maybeSingle();
    if (error) throw new NoteApplicationError("Não foi possível atualizar o documento.");
    if (!data) throw new NoteConflictError();
    return toItem(data as ItemRow);
  }

  async moveItem(id: string, folderId: string | null, memberId: string): Promise<void> {
    const { error } = await this.supabase
      .from("note_items")
      .update({ folder_id: folderId, updated_at: new Date().toISOString(), updated_by_member_id: memberId })
      .eq("id", id);
    if (error) throw new NoteApplicationError("Não foi possível mover o documento.");
  }

  async deleteFolder(id: string): Promise<void> {
    const { error } = await this.supabase.from("note_folders").delete().eq("id", id);
    if (error) throw new NoteApplicationError("Não foi possível eliminar a pasta.");
  }

  async deleteItem(id: string): Promise<void> {
    const { error } = await this.supabase.from("note_items").delete().eq("id", id);
    if (error) throw new NoteApplicationError("Não foi possível eliminar o documento.");
  }
}

function toFolder(row: FolderRow): NoteFolder {
  return { color: row.color, createdAt: row.created_at, id: row.id, name: row.name, updatedAt: row.updated_at };
}

function toItem(row: ItemRow): NoteItem {
  return {
    body: row.body,
    createdAt: row.created_at,
    folderId: row.folder_id,
    googleDocumentId: row.google_document_id,
    googleHtmlLink: row.google_html_link,
    googleModifiedAt: row.google_modified_at,
    googleOwnerMemberId: row.google_owner_member_id,
    googleRevisionId: row.google_revision_id,
    id: row.id,
    kind: row.kind,
    mimeType: row.mime_type,
    originalFileName: row.original_file_name,
    sizeBytes: row.size_bytes,
    storagePath: row.storage_path,
    title: row.title,
    updatedAt: row.updated_at,
    version: row.version,
  };
}
