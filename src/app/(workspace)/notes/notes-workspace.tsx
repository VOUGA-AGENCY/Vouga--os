"use client";

import {
  ChevronDown, ExternalLink, File as FileIcon, FileImage, Files, FileText, Folder, FolderPlus,
  Pencil, Plus, StickyNote, Trash2, Upload, X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { NOTE_UPLOAD_MAX_BYTES, type NoteFolder, type NoteItem } from "@/domain/notes/note";
import { createFolderAction, createGoogleDocumentAction, createOsNoteAction } from "./actions";

type Props = {
  folders: NoteFolder[];
  items: NoteItem[];
  isAdmin: boolean;
  googleConnected: boolean;
  initialFolderId: string | null;
  initialOpenId: string | null;
};

type CreateMode = "folder" | "os_note" | "google_doc" | "upload" | null;
type Position = { x: number; y: number };
type DeleteTarget = { id: string; kind: "folder" | "item"; title: string };
const UNFILED = "__unfiled__";

export function NotesWorkspace(props: Props) {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(props.initialFolderId);
  const [createMode, setCreateMode] = useState<CreateMode>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [renameFolder, setRenameFolder] = useState<NoteFolder | null>(null);
  const [folders, setFolders] = useState(props.folders);
  const [items, setItems] = useState(props.items);
  const [openItem, setOpenItem] = useState<NoteItem | null>(
    props.items.find((item) => item.id === props.initialOpenId) ?? null,
  );
  const [positions, setPositions] = useState<Record<string, Position>>({});
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        setPositions(JSON.parse(localStorage.getItem("vouga.notes.folderPositions") ?? "{}"));
      } catch {
        setPositions({});
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const visibleItems = useMemo(() => {
    if (selectedFolderId === UNFILED) return items.filter((item) => item.folderId === null);
    if (selectedFolderId) return items.filter((item) => item.folderId === selectedFolderId);
    return items;
  }, [items, selectedFolderId]);
  const selectedName = selectedFolderId === UNFILED
    ? "Sem pasta"
    : folders.find((folder) => folder.id === selectedFolderId)?.name ?? "All documents";

  function updateItem(saved: NoteItem) {
    setItems((current) => current.map((item) => item.id === saved.id ? saved : item));
    setOpenItem(saved);
  }

  function moveFolder(folderId: string, event: React.DragEvent<HTMLButtonElement>) {
    const canvas = canvasRef.current?.getBoundingClientRect();
    if (!canvas) return;
    const next = {
      ...positions,
      [folderId]: {
        x: Math.max(0, Math.min(canvas.width - 120, event.clientX - canvas.left - 48)),
        y: Math.max(0, Math.min(canvas.height - 96, event.clientY - canvas.top - 40)),
      },
    };
    setPositions(next);
    localStorage.setItem("vouga.notes.folderPositions", JSON.stringify(next));
  }

  async function open(item: NoteItem) {
    if (item.kind === "upload") {
      setOpenItem(item);
      return;
    }
    const response = await fetch(`/api/notes/${item.id}`, { cache: "no-store" });
    const payload = await response.json();
    setOpenItem(payload.note ?? item);
  }

  return (
    <>
      <header className="module-heading notes-workspace-heading">
        <div><h1 className="display">Notes</h1></div>
        <div className="notes-new-wrap">
          <button className="button-primary" onClick={() => setMenuOpen((value) => !value)} type="button">
            <Plus aria-hidden="true" /> New <ChevronDown aria-hidden="true" />
          </button>
          {menuOpen ? (
            <div className="notes-new-menu" role="menu">
              <CreateChoice icon={<StickyNote />} label="OS Note" onClick={() => setCreateMode("os_note")} />
              {props.isAdmin ? <CreateChoice disabled={!props.googleConnected} icon={<FileText />} label="Google Note" onClick={() => setCreateMode("google_doc")} /> : null}
              <CreateChoice icon={<Upload />} label="Importar" onClick={() => setCreateMode("upload")} />
              <CreateChoice icon={<FolderPlus />} label="Nova pasta" onClick={() => setCreateMode("folder")} />
            </div>
          ) : null}
        </div>
      </header>

      <section aria-labelledby="notes-folders-title" className="notes-folders-section">
        <div className="notes-section-heading">
          <h2 id="notes-folders-title">Folders</h2>
          <button className="notes-text-action" onClick={() => setSelectedFolderId(null)} type="button">Show all</button>
        </div>
        <div className="notes-folder-canvas" ref={canvasRef}>
          <div className="notes-folder-slot notes-unfiled-slot" style={{ left: 0, top: 0 }}>
            <button
              aria-pressed={selectedFolderId === UNFILED}
              className="notes-folder notes-folder-unfiled"
              onClick={() => setSelectedFolderId(UNFILED)}
              type="button"
            >
              <Files aria-hidden="true" />
              <span>Sem pasta</span>
              <small>{items.filter((item) => item.folderId === null).length}</small>
            </button>
          </div>
          {folders.map((folder, index) => {
            const defaultIndex = index + 1;
            const position = positions[folder.id] ?? { x: (defaultIndex % 5) * 128, y: Math.floor(defaultIndex / 5) * 96 };
            return (
              <div className="notes-folder-slot" key={folder.id} style={{ left: position.x, top: position.y }}>
                <button
                  aria-pressed={selectedFolderId === folder.id}
                  className={`notes-folder notes-folder-${folder.color}`}
                  draggable
                  onClick={() => setSelectedFolderId(folder.id)}
                  onDragEnd={(event) => moveFolder(folder.id, event)}
                  type="button"
                >
                  <Folder aria-hidden="true" />
                  <span>{folder.name}</span>
                  <small>{items.filter((item) => item.folderId === folder.id).length}</small>
                </button>
                <div className="notes-folder-actions">
                  <EditIconButton label={`Renomear pasta ${folder.name}`} onClick={() => setRenameFolder(folder)} />
                  {props.isAdmin ? <DeleteIconButton label={`Eliminar pasta ${folder.name}`} onClick={() => setDeleteTarget({ id: folder.id, kind: "folder", title: folder.name })} /> : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="notes-documents-title" className="notes-documents-section">
        <div className="notes-section-heading">
          <h2 id="notes-documents-title">{selectedName}</h2>
          <span>{visibleItems.length}</span>
        </div>
        <div className="notes-document-grid">
          {visibleItems.map((item) => (
            <div className="notes-document-row" key={item.id}>
              <button className="notes-document" onClick={() => open(item)} type="button">
                <NoteIcon item={item} />
                <span><strong>{item.title}</strong><small>{formatKind(item)} · {formatDate(item.updatedAt)}</small></span>
              </button>
              {props.isAdmin ? <DeleteIconButton label={`Eliminar ${item.title}`} onClick={() => setDeleteTarget({ id: item.id, kind: "item", title: item.title })} /> : null}
            </div>
          ))}
          {visibleItems.length === 0 ? <p className="notes-inline-empty">No documents in this folder.</p> : null}
        </div>
      </section>

      {createMode ? (
        <CreateDialog
          folders={folders}
          googleConnected={props.googleConnected}
          mode={createMode}
          onClose={() => setCreateMode(null)}
          selectedFolderId={selectedFolderId === UNFILED ? null : selectedFolderId}
        />
      ) : null}
      {openItem ? <DocumentDialog folders={folders} isAdmin={props.isAdmin} item={openItem} onClose={() => setOpenItem(null)} onSaved={updateItem} /> : null}
      {renameFolder ? <RenameFolderDialog folder={renameFolder} onClose={() => setRenameFolder(null)} onSaved={(name) => {
        setFolders((current) => current.map((folder) => folder.id === renameFolder.id ? { ...folder, name } : folder));
        setRenameFolder(null);
      }} /> : null}
      {deleteTarget ? <DeleteDialog onClose={() => setDeleteTarget(null)} selectedFolderId={selectedFolderId} target={deleteTarget} /> : null}
    </>
  );
}

function EditIconButton({ label, onClick }: { label: string; onClick: () => void }) {
  return <button aria-label={label} className="notes-edit-icon" onClick={onClick} title={label} type="button"><Pencil aria-hidden="true" /></button>;
}

function DeleteIconButton({ label, onClick }: { label: string; onClick: () => void }) {
  return <button aria-label={label} className="notes-delete-icon" onClick={onClick} title={label} type="button"><Trash2 aria-hidden="true" /></button>;
}

function RenameFolderDialog({ folder, onClose, onSaved }: {
  folder: NoteFolder; onClose: () => void; onSaved: (name: string) => void;
}) {
  const [name, setName] = useState(folder.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function save(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError(null);
    try {
      const response = await fetch(`/api/notes/folders/${folder.id}`, {
        body: JSON.stringify({ name }), headers: { "Content-Type": "application/json" }, method: "PATCH",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) { setError(payload?.error ?? "Não foi possível renomear."); return; }
      onSaved(name.trim());
    } catch {
      setError("Não foi possível renomear a pasta.");
    } finally {
      setSaving(false);
    }
  }
  return <div aria-modal="true" className="notes-dialog-backdrop" role="dialog"><div className="notes-create-dialog">
    <DialogHeader onClose={onClose} title="Renomear pasta" />
    <form onSubmit={save}>
      <input autoFocus maxLength={80} onChange={(event) => setName(event.target.value)} required value={name} />
      {error ? <p className="notes-form-error">{error}</p> : null}
      <button className="button-primary" disabled={saving} type="submit">{saving ? "A guardar…" : "Guardar"}</button>
    </form>
  </div></div>;
}

function DeleteDialog({ onClose, selectedFolderId, target }: {
  onClose: () => void; selectedFolderId: string | null; target: DeleteTarget;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setDeleting(true); setError(null);
    const url = target.kind === "folder" ? `/api/notes/folders/${target.id}` : `/api/notes/${target.id}`;
    const response = await fetch(url, { method: "DELETE" });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setError(payload?.error ?? "Não foi possível eliminar."); setDeleting(false); return;
    }
    const folder = target.kind === "folder" && selectedFolderId === target.id ? null : selectedFolderId;
    window.location.assign(folder ? `/notes?folder=${folder}` : "/notes");
  }

  return <div aria-modal="true" className="notes-dialog-backdrop" role="dialog">
    <div className="notes-delete-dialog">
      <DialogHeader onClose={onClose} title={target.kind === "folder" ? "Eliminar pasta?" : "Eliminar documento?"} />
      <p><strong>{target.title}</strong></p>
      <p>{target.kind === "folder" ? "Os documentos ficam disponíveis em All documents." : "Esta ação não pode ser anulada no OS."}</p>
      {error ? <p className="notes-form-error">{error}</p> : null}
      <div className="notes-delete-actions">
        <button disabled={deleting} onClick={onClose} type="button">Cancelar</button>
        <button className="button-danger" disabled={deleting} onClick={remove} type="button">{deleting ? "A eliminar…" : "Eliminar"}</button>
      </div>
    </div>
  </div>;
}

function CreateChoice({ disabled, icon, label, onClick }: { disabled?: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return <button disabled={disabled} onClick={onClick} role="menuitem" type="button">{icon}<span>{label}</span></button>;
}

function CreateDialog({ folders, googleConnected, mode, onClose, selectedFolderId }: {
  folders: NoteFolder[]; googleConnected: boolean; mode: Exclude<CreateMode, null>;
  onClose: () => void; selectedFolderId: string | null;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const action = mode === "folder" ? createFolderAction : mode === "google_doc" ? createGoogleDocumentAction : createOsNoteAction;

  async function uploadFile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploading(true); setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      const file = formData.get("file");
      if (file instanceof globalThis.File && file.size > NOTE_UPLOAD_MAX_BYTES) {
        setError("O ficheiro deve ter no máximo 10 MB."); return;
      }
      const response = await fetch("/api/notes/upload", { body: formData, method: "POST" });
      const payload = await response.json();
      if (!response.ok) { setError(payload.error ?? "Não foi possível importar."); return; }
      window.location.assign(`/notes?open=${payload.id}`);
    } catch {
      setError("Não foi possível importar o ficheiro.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div aria-modal="true" className="notes-dialog-backdrop" role="dialog">
      <div className="notes-create-dialog">
        <DialogHeader onClose={onClose} title={dialogTitle(mode)} />
        {mode === "upload" ? (
          <form onSubmit={uploadFile} ref={formRef}>
            <input accept=".pdf,.png,.jpg,.jpeg,.docx" name="file" required type="file" />
            <FolderSelect folders={folders} selectedFolderId={selectedFolderId} />
            {error ? <p className="notes-form-error">{error}</p> : null}
            <button className="button-primary" disabled={uploading} type="submit">{uploading ? "Importing…" : "Import"}</button>
          </form>
        ) : (
          <form action={action}>
            {mode === "folder" ? (
              <><input autoFocus maxLength={80} name="name" placeholder="Folder name" required />
              <div className="notes-color-options">{["amber","blue","green","rose","violet","graphite"].map((color) => <label key={color}><input defaultChecked={color === "amber"} name="color" type="radio" value={color} /><span className={`notes-color notes-color-${color}`} /></label>)}</div></>
            ) : (
              <><input autoFocus maxLength={180} name="title" placeholder="Untitled" required />
              <FolderSelect folders={folders} selectedFolderId={selectedFolderId} /></>
            )}
            {mode === "google_doc" && googleConnected ? <a className="notes-picker-link" href="/api/google/picker/start">Choose an existing Google Doc</a> : null}
            <button className="button-primary" type="submit">Create</button>
          </form>
        )}
      </div>
    </div>
  );
}

function FolderSelect({ folders, selectedFolderId }: { folders: NoteFolder[]; selectedFolderId: string | null }) {
  return <select defaultValue={selectedFolderId ?? ""} name="folder_id"><option value="">No folder</option>{folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select>;
}

function DocumentDialog({ folders, isAdmin, item, onClose, onSaved }: {
  folders: NoteFolder[]; isAdmin: boolean; item: NoteItem; onClose: () => void; onSaved: (item: NoteItem) => void;
}) {
  if (item.kind === "upload") return <FilePreview folders={folders} item={item} onClose={onClose} onSaved={onSaved} />;
  return <NoteEditor editable={item.kind === "os_note" || isAdmin} folders={folders} item={item} onClose={onClose} onSaved={onSaved} />;
}

function NoteEditor({ editable, folders, item, onClose, onSaved }: {
  editable: boolean; folders: NoteFolder[]; item: NoteItem; onClose: () => void; onSaved: (item: NoteItem) => void;
}) {
  const [title, setTitle] = useState(item.title);
  const [body, setBody] = useState(item.body ?? "");
  const [folderId, setFolderId] = useState(item.folderId ?? "");
  const [version, setVersion] = useState(item.version);
  const [revision, setRevision] = useState(item.googleRevisionId);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState(editable ? "Saved" : "Read only");

  useEffect(() => {
    if (!editable || !dirty) return;
    const timeout = window.setTimeout(async () => {
      const response = await fetch(`/api/notes/${item.id}`, {
        body: JSON.stringify({ body, expectedGoogleRevisionId: revision, expectedVersion: version, folderId, title }),
        headers: { "Content-Type": "application/json" }, method: "PATCH",
      });
      const payload = await response.json();
      if (!response.ok) { setStatus(payload.error ?? "Not saved"); return; }
      setVersion(payload.note.version); setRevision(payload.note.googleRevisionId); setDirty(false); setStatus("Saved"); onSaved(payload.note);
    }, 900);
    return () => window.clearTimeout(timeout);
  }, [body, dirty, editable, folderId, item.id, onSaved, revision, title, version]);

  useEffect(() => {
    if (!editable || item.kind !== "google_doc") return;
    const interval = window.setInterval(async () => {
      if (dirty) return;
      const response = await fetch(`/api/notes/${item.id}`, { cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.note) return;
      setTitle(payload.note.title);
      setBody(payload.note.body ?? "");
      setFolderId(payload.note.folderId ?? "");
      setVersion(payload.note.version);
      setRevision(payload.note.googleRevisionId);
      setStatus("Synced");
    }, 30_000);
    return () => window.clearInterval(interval);
  }, [dirty, editable, item.id, item.kind]);

  return <div aria-modal="true" className="notes-dialog-backdrop" role="dialog"><div className="notes-editor-dialog">
    <div className="notes-editor-toolbar"><span>{item.kind === "google_doc" ? "Google Note" : "OS Note"} · {status}</span><div>{item.googleHtmlLink ? <a href={item.googleHtmlLink} rel="noreferrer" target="_blank">Open in Google <ExternalLink /></a> : null}<button aria-label="Close" onClick={onClose} type="button"><X /></button></div></div>
    <input aria-label="Note title" className="notes-editor-title" disabled={!editable} onChange={(event) => { setTitle(event.target.value); setDirty(true); setStatus("Saving…"); }} value={title} />
    <DocumentFolderSelect disabled={!editable} folders={folders} onChange={(value) => { setFolderId(value); setDirty(true); setStatus("Saving…"); }} value={folderId} />
    <textarea aria-label="Note content" autoFocus={editable} className="notes-editor-body" disabled={!editable} onChange={(event) => { setBody(event.target.value); setDirty(true); setStatus("Saving…"); }} placeholder="Start writing…" value={body} />
  </div></div>;
}

function FilePreview({ folders, item, onClose, onSaved }: {
  folders: NoteFolder[]; item: NoteItem; onClose: () => void; onSaved: (item: NoteItem) => void;
}) {
  const url = `/api/notes/files/${item.id}`;
  const [title, setTitle] = useState(item.title);
  const [folderId, setFolderId] = useState(item.folderId ?? "");
  const [version, setVersion] = useState(item.version);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [docxText, setDocxText] = useState<string | null>(null);
  useEffect(() => {
    if (item.mimeType !== "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return;
    fetch(url).then((response) => response.arrayBuffer()).then(async (buffer) => {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ arrayBuffer: buffer });
      setDocxText(result.value);
    }).catch(() => setDocxText("Could not preview this document."));
  }, [item.mimeType, url]);
  async function saveMetadata() {
    setSaving(true); setError(null);
    try {
      const response = await fetch(`/api/notes/${item.id}`, {
        body: JSON.stringify({ action: "metadata", expectedVersion: version, folderId, title }),
        headers: { "Content-Type": "application/json" }, method: "PATCH",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) { setError(payload?.error ?? "Não foi possível guardar."); return; }
      setTitle(payload.note.title); setFolderId(payload.note.folderId ?? ""); setVersion(payload.note.version);
      setDirty(false); onSaved(payload.note);
    } catch {
      setError("Não foi possível guardar.");
    } finally {
      setSaving(false);
    }
  }
  return <div aria-modal="true" className="notes-dialog-backdrop" role="dialog"><div className="notes-file-dialog"><DialogHeader onClose={onClose} title={title} />
    <div className="notes-file-metadata">
      <input aria-label="Document title" maxLength={180} onChange={(event) => { setTitle(event.target.value); setDirty(true); }} value={title} />
      <DocumentFolderSelect folders={folders} onChange={(value) => { setFolderId(value); setDirty(true); }} value={folderId} />
      <button className="notes-metadata-save" disabled={!dirty || saving} onClick={saveMetadata} type="button">{saving ? "A guardar…" : "Guardar"}</button>
    </div>
    {error ? <p className="notes-form-error">{error}</p> : null}
    {/* Authenticated file routes cannot use the Next image optimizer safely. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {item.mimeType?.startsWith("image/") ? <img alt={title} src={url} /> : item.mimeType === "application/pdf" ? <iframe src={url} title={title} /> : <pre>{docxText ?? "Loading document…"}</pre>}
  </div></div>;
}

function DocumentFolderSelect({ disabled, folders, onChange, value }: {
  disabled?: boolean; folders: NoteFolder[]; onChange: (value: string) => void; value: string;
}) {
  return <select aria-label="Folder" className="notes-document-folder" disabled={disabled} onChange={(event) => onChange(event.target.value)} value={value}>
    <option value="">Sem pasta</option>
    {folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
  </select>;
}

function DialogHeader({ onClose, title }: { onClose: () => void; title: string }) { return <header><h2>{title}</h2><button aria-label="Close" onClick={onClose} type="button"><X /></button></header>; }
function NoteIcon({ item }: { item: NoteItem }) { return item.kind === "os_note" ? <StickyNote /> : item.kind === "google_doc" ? <FileText /> : item.mimeType?.startsWith("image/") ? <FileImage /> : <FileIcon />; }
function dialogTitle(mode: Exclude<CreateMode, null>) { return mode === "folder" ? "New folder" : mode === "os_note" ? "New OS Note" : mode === "google_doc" ? "New Google Note" : "Import file"; }
function formatKind(item: NoteItem) { return item.kind === "os_note" ? "OS Note" : item.kind === "google_doc" ? "Google Note" : item.mimeType?.split("/").pop()?.toUpperCase() ?? "File"; }
function formatDate(value: string) { return new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium" }).format(new Date(value)); }
