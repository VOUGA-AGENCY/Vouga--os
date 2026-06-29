import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { events } from "@/lib/data";
import { CompanyCalendar } from "@/components/CompanyCalendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/calendario")({
  component: CalendarioPage,
});

function localDateInputValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function CalendarioPage() {
  const qc = useQueryClient();
  const [date, setDate] = useState<string>("");
  const [time, setTime] = useState<string>("09:00");
  const [endTime, setEndTime] = useState<string>("10:00");
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("custom");
  const [openDialog, setOpenDialog] = useState(false);

  const startNew = (d: Date) => {
    setDate(localDateInputValue(d));
    const hour = d.getHours();
    setTime(`${String(hour || 9).padStart(2, "0")}:00`);
    setEndTime(`${String(Math.min((hour || 9) + 1, 23)).padStart(2, "0")}:00`);
    setTitle("");
    setKind("custom");
    setOpenDialog(true);
  };

  const save = async () => {
    if (!title.trim() || !date) return toast.error("Falta título ou data.");
    const startsAt = new Date(`${date}T${time}:00`).toISOString();
    const endsAt = new Date(`${date}T${endTime}:00`).toISOString();
    try {
      await events.create({ title: title.trim(), starts_at: startsAt, ends_at: endsAt, kind });
    } catch (e) {
      return toast.error((e as Error).message);
    }
    setOpenDialog(false);
    toast.success("Evento criado.");
    qc.invalidateQueries({ queryKey: ["company-calendar"] });
  };

  const remove = async (id: string) => {
    try {
      await events.remove(id);
      toast.success("Evento apagado.");
      qc.invalidateQueries({ queryKey: ["company-calendar"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="relative left-1/2 w-screen -translate-x-1/2 px-4 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-[1580px] space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="vouga-label">Calendário</p>
            <h1 className="mt-3 text-4xl tracking-tight md:text-6xl">Agenda da casa.</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Um calendário para perceber foco, carga e próximos passos sem andar à caça de quadradinhos.
            </p>
          </div>
          <Button onClick={() => startNew(new Date())} className="w-fit rounded-full px-5">
            + Evento
          </Button>
        </header>

        <CompanyCalendar defaultView="week" onNewMeeting={startNew} onEventDelete={remove} />
      </div>

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="overflow-hidden p-0 sm:max-w-xl">
          <div className="bg-[#1a1813] px-6 py-5 text-[#f6f1e6]">
            <DialogHeader>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#f6f1e6]/55">Novo bloco</p>
              <DialogTitle className="mt-2 text-3xl">Adicionar à agenda</DialogTitle>
            </DialogHeader>
          </div>
          <div className="space-y-5 px-6 py-5">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Reunião, prazo, bloco de trabalho..."
                className="h-11 rounded-xl bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  ["custom", "Evento"],
                  ["meeting", "Reunião"],
                  ["task_due", "Prazo"],
                  ["social", "Equipa"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setKind(value)}
                    className={`rounded-xl border px-3 py-2 text-sm transition-colors ${
                      kind === value
                        ? "border-[#1a1813] bg-[#1a1813] text-[#f6f1e6]"
                        : "border-border bg-background hover:bg-white"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Data</Label>
                <Input className="h-11 rounded-xl bg-background" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Início</Label>
                <Input className="h-11 rounded-xl bg-background" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Fim</Label>
                <Input className="h-11 rounded-xl bg-background" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter className="border-t border-border bg-muted/40 px-6 py-4">
            <Button variant="ghost" onClick={() => setOpenDialog(false)}>Cancelar</Button>
            <Button className="rounded-full px-5" onClick={save}>Criar evento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
