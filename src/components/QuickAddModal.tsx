import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { OwnersMultiSelect } from "@/components/OwnersMultiSelect";

type Kind = "idea" | "bug" | "task" | null;
type Priority = "urgent" | "important" | "medium" | "low";

export function QuickAddModal({
  kind,
  onClose,
  defaultTarget = "sprint",
  lockTarget = false,
}: {
  kind: Kind;
  onClose: () => void;
  defaultTarget?: "sprint" | "backlog";
  lockTarget?: boolean;
}) {
  const { profile, user, role } = useAuth();
  const isAdmin = role === "admin";
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [ownerIds, setOwnerIds] = useState<string[]>([]);
  const [priority, setPriority] = useState<Priority>("medium");
  const [needsDoc, setNeedsDoc] = useState(false);
  const [boardOnly, setBoardOnly] = useState(false);
  const [target, setTarget] = useState<"sprint" | "backlog">(defaultTarget);
  const [busy, setBusy] = useState(false);

  const peopleQ = useQuery({
    queryKey: ["profiles-id-name"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id,full_name").order("full_name");
      return (data ?? []) as { id: string; full_name: string }[];
    },
  });

  useEffect(() => {
    if (kind) {
      setTitle("");
      setDesc("");
      setOwnerIds(user?.id ? [user.id] : []);
      setPriority("medium");
      setNeedsDoc(false);
      setBoardOnly(false);
      setTarget(defaultTarget);
    }
  }, [kind, user?.id, defaultTarget]);

  if (!kind) return null;

  const meta = {
    idea: { title: "Registar ideia", placeholder: "A ideia em uma linha" },
    bug: { title: "Reportar bug", placeholder: "O que aconteceu?" },
    task: { title: "Nova tarefa", placeholder: "O que tem de ser feito?" },
  }[kind];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    const name = profile?.full_name ?? "sem nome";
    let res;
    if (kind === "idea") {
      res = await supabase.from("ideas").insert({
        title,
        description: desc || null,
        created_by_name: name,
      });
    } else if (kind === "bug") {
      res = await supabase.from("bugs").insert({
        title,
        description: desc || null,
        created_by_name: name,
      });
    } else {
      let sprintId: string | null = null;
      if (target === "sprint") {
        const { data: s } = await supabase.from("sprints").select("id").order("starts_on", { ascending: false }).limit(1).maybeSingle();
        sprintId = s?.id ?? null;
      }
      const ids = ownerIds.length ? ownerIds : user?.id ? [user.id] : [];
      const { data: created, error: insErr } = await supabase
        .from("tasks")
        .insert({
          title,
          description: desc || null,
          priority,
          needs_documentation: needsDoc,
          sprint_id: sprintId,
          board_only: isAdmin ? boardOnly : false,
        })
        .select("id")
        .single();
      if (insErr) {
        res = { error: insErr };
      } else {
        if (ids.length) {
          const { error: aErr } = await supabase
            .from("task_assignees")
            .insert(ids.map((profile_id) => ({ task_id: created.id, profile_id })));
          if (aErr) {
            res = { error: aErr };
          } else {
            res = { error: null };
          }
        } else {
          res = { error: null };
        }
      }
    }
    setBusy(false);
    if (res.error) {
      toast.error(res.error.message);
    } else {
      toast.success(
        kind === "bug"
          ? "Bug registado. Tarefa urgente criada automaticamente."
          : kind === "idea"
            ? "Ideia registada. Aguarda revisão da board."
            : "Tarefa criada.",
      );
      qc.invalidateQueries();
      onClose();
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{meta.title}</DialogTitle>
          <DialogDescription className="sr-only">{meta.title}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="t">Título</Label>
            <Input
              id="t"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={meta.placeholder}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="d">Descrição</Label>
            <Textarea id="d" value={desc} onChange={(e) => setDesc(e.target.value)} rows={4} />
          </div>

          {kind === "task" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Owners</Label>
                  <OwnersMultiSelect
                    profiles={peopleQ.data ?? []}
                    value={ownerIds}
                    onChange={setOwnerIds}
                    size="md"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Prioridade</Label>
                  <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="urgent">Urgente</SelectItem>
                      <SelectItem value="important">Importante</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="low">Baixa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {!lockTarget && (
                <div className="space-y-2">
                  <Label>Destino</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={target === "sprint" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTarget("sprint")}
                      className="flex-1"
                    >
                      Sprint atual
                    </Button>
                    <Button
                      type="button"
                      variant={target === "backlog" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTarget("backlog")}
                      className="flex-1"
                    >
                      Backlog
                    </Button>
                  </div>
                </div>
              )}
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={needsDoc}
                  onCheckedChange={(v) => setNeedsDoc(!!v)}
                />
                Precisa de documentação (cria doc associada)
              </label>
              {isAdmin && (
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={boardOnly}
                    onCheckedChange={(v) => setBoardOnly(!!v)}
                  />
                  Task de board (apenas visível para admins)
                </label>
              )}
            </>
          )}

          {kind === "bug" && (
            <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              Vai ser criada automaticamente uma tarefa urgente associada a este bug.
            </p>
          )}

          {kind === "idea" && (
            <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              A board vai rever a ideia. Se for aceite, passa a tarefa.
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "A guardar..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
