import { sb } from "./sb";
import type { Doc, Resource } from "./types";

export const documents = {
  async list(): Promise<Doc[]> {
    const { data, error } = await sb
      .from("docs")
      .select("id,title,content,task_id,updated_at")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((d: any) => ({ ...d, content: d.content ?? "" })) as Doc[];
  },
  async create(title: string, task_id: string | null = null): Promise<string> {
    const { data, error } = await sb
      .from("docs")
      .insert({ title, task_id, content: "", status: "draft" })
      .select("id")
      .single();
    if (error) throw error;
    return data.id as string;
  },
  async update(id: string, patch: Partial<Pick<Doc, "title" | "content" | "task_id">>): Promise<void> {
    const { error } = await sb.from("docs").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) throw error;
  },
  async remove(id: string): Promise<void> {
    const { error } = await sb.from("docs").delete().eq("id", id);
    if (error) throw error;
  },
};

export const resources = {
  async list(): Promise<Resource[]> {
    const { data, error } = await sb.from("resources").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Resource[];
  },
  async upload(file: File, task_id: string | null = null): Promise<void> {
    const path = `${Date.now()}_${file.name}`;
    const up = await sb.storage.from("resources").upload(path, file);
    if (up.error) throw up.error;
    const { error } = await sb.from("resources").insert({
      name: file.name,
      path,
      mime: file.type,
      size: file.size,
      task_id,
    });
    if (error) throw error;
  },
  async signedUrl(path: string): Promise<string | null> {
    const { data } = await sb.storage.from("resources").createSignedUrl(path, 60);
    return data?.signedUrl ?? null;
  },
  async remove(id: string, path: string): Promise<void> {
    await sb.storage.from("resources").remove([path]);
    const { error } = await sb.from("resources").delete().eq("id", id);
    if (error) throw error;
  },
};
