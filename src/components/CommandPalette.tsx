import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { BookOpen, ListChecks, Calendar, FolderKanban, Wallet, Users, Lightbulb, Bug } from "lucide-react";
import { QuickAddModal } from "@/components/QuickAddModal";
import { useAuth } from "@/lib/auth";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [quick, setQuick] = useState<null | "idea" | "bug" | "task">(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onCustom = () => setOpen(true);
    const onQuickAdd = () => { setOpen(false); setQuick("task"); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("kind:open-cmdk", onCustom as EventListener);
    window.addEventListener("vouga:quick-add", onQuickAdd as EventListener);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("kind:open-cmdk", onCustom as EventListener);
      window.removeEventListener("vouga:quick-add", onQuickAdd as EventListener);
    };
  }, []);

  if (!user) return null;

  const go = (to: string) => {
    setOpen(false);
    navigate({ to });
  };

  return (
    <>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Procurar páginas, ações…" />
        <CommandList>
          <CommandEmpty>Sem resultados.</CommandEmpty>
          <CommandGroup heading="Navegar">
            <CommandItem onSelect={() => go("/sobre")}><BookOpen className="mr-2 h-4 w-4" />O que fazemos</CommandItem>
            <CommandItem onSelect={() => go("/passos")}><ListChecks className="mr-2 h-4 w-4" />Próximos passos</CommandItem>
            <CommandItem onSelect={() => go("/calendario")}><Calendar className="mr-2 h-4 w-4" />Calendário</CommandItem>
            <CommandItem onSelect={() => go("/engineers")}><FolderKanban className="mr-2 h-4 w-4" />Projetos</CommandItem>
            <CommandItem onSelect={() => go("/financas")}><Wallet className="mr-2 h-4 w-4" />Finanças</CommandItem>
            <CommandItem onSelect={() => go("/pipeline")}><Users className="mr-2 h-4 w-4" />CRM</CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Criar">
            <CommandItem onSelect={() => { setOpen(false); setQuick("task"); }}>
              + Nova tarefa
            </CommandItem>
            <CommandItem onSelect={() => { setOpen(false); setQuick("idea"); }}>
              <Lightbulb className="mr-2 h-4 w-4" /> Registar ideia
            </CommandItem>
            <CommandItem onSelect={() => { setOpen(false); setQuick("bug"); }}>
              <Bug className="mr-2 h-4 w-4" /> Reportar bug
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
      <QuickAddModal kind={quick} onClose={() => setQuick(null)} />
    </>
  );
}
