import type { NoteFolder, NoteFolderColor, NoteItem } from "@/domain/notes/note";

export type CreateNoteItem = Readonly<{
  id: string;
  folderId: string | null;
  kind: NoteItem["kind"];
  title: string;
  body: string | null;
  googleDocumentId?: string | null;
  googleHtmlLink?: string | null;
  googleOwnerMemberId?: string | null;
  googleRevisionId?: string | null;
  googleModifiedAt?: string | null;
  storagePath?: string | null;
  originalFileName?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  memberId: string;
}>;

export interface NoteRepository {
  listFolders(): Promise<NoteFolder[]>;
  listItems(): Promise<NoteItem[]>;
  findItem(id: string): Promise<NoteItem | null>;
  createFolder(values: { id: string; name: string; color: NoteFolderColor; memberId: string }): Promise<void>;
  createItem(values: CreateNoteItem): Promise<void>;
  updateFolder(id: string, values: { name?: string; color?: NoteFolderColor }): Promise<void>;
  updateItem(values: {
    id: string;
    memberId: string;
    title: string;
    body: string;
    expectedVersion: number;
    folderId?: string | null;
    googleRevisionId?: string | null;
    googleModifiedAt?: string | null;
  }): Promise<NoteItem>;
  updateItemMetadata(values: {
    id: string;
    memberId: string;
    title: string;
    folderId: string | null;
    expectedVersion: number;
  }): Promise<NoteItem>;
  moveItem(id: string, folderId: string | null, memberId: string): Promise<void>;
  deleteFolder(id: string): Promise<void>;
  deleteItem(id: string): Promise<void>;
}

export interface NoteFileStorage {
  upload(path: string, file: Blob, mimeType: string): Promise<void>;
  download(path: string): Promise<Blob>;
  remove(path: string): Promise<void>;
}
