"use client";

import { X } from "lucide-react";
import { useState } from "react";

import type { TaskStatus } from "@/domain/tasks/task";
import { FormSubmit } from "@/foundation/ui/form-controls";

import { updateTaskStatusAction } from "./actions";

type NextStatus = "in_progress" | "blocked" | "completed";

const OPTIONS: Record<TaskStatus, readonly Readonly<{ value: NextStatus; label: string }>[]> = {
  todo: [
    { label: "Em curso", value: "in_progress" },
    { label: "Bloqueada", value: "blocked" },
    { label: "Concluída", value: "completed" },
  ],
  in_progress: [
    { label: "Bloqueada", value: "blocked" },
    { label: "Concluída", value: "completed" },
  ],
  blocked: [
    { label: "Em curso", value: "in_progress" },
    { label: "Concluída", value: "completed" },
  ],
  completed: [],
  cancelled: [],
};

export function TaskStatusUpdate({ taskId, status }: { taskId: string; status: TaskStatus }) {
  const options = OPTIONS[status];
  const [open, setOpen] = useState(false);
  const [nextStatus, setNextStatus] = useState<NextStatus | null>(null);

  if (!options.length) return null;

  return (
    <>
      <button className="task-status-trigger" onClick={() => setOpen(true)} type="button">
        Atualizar estado
      </button>
      {open ? (
        <div className="crm-modal-backdrop" onMouseDown={() => setOpen(false)}>
          <section
            aria-labelledby={`${taskId}-status-title`}
            aria-modal="true"
            className="crm-interaction-modal task-status-modal"
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
          >
            <header>
              <h2 id={`${taskId}-status-title`}>Atualizar estado</h2>
              <button aria-label="Fechar" onClick={() => setOpen(false)} type="button">
                <X aria-hidden="true" />
              </button>
            </header>
            <div className="task-status-options" role="group" aria-label="Novo estado">
              {options.map((option) => (
                <button
                  aria-pressed={nextStatus === option.value}
                  className={`button-secondary task-status-option${nextStatus === option.value ? " active" : ""}`}
                  key={option.value}
                  onClick={() => setNextStatus(option.value)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
            {nextStatus ? (
              <form action={updateTaskStatusAction.bind(null, taskId)} className="task-status-form">
                <input name="next_status" type="hidden" value={nextStatus} />
                {nextStatus === "blocked" ? (
                  <div className="task-status-details">
                    <div className="field field-light">
                      <label htmlFor={`${taskId}-blocked-reason`}>Causa do bloqueio</label>
                      <textarea
                        id={`${taskId}-blocked-reason`}
                        name="blocked_reason"
                        placeholder="Ex.: Aguardar validação jurídica."
                        required
                        rows={3}
                      />
                    </div>
                    <div className="field field-light">
                      <label htmlFor={`${taskId}-blocked-next-move`}>Próximo movimento</label>
                      <textarea
                        id={`${taskId}-blocked-next-move`}
                        name="blocked_next_move"
                        placeholder="Ex.: Pedir resposta até sexta-feira."
                        required
                        rows={3}
                      />
                    </div>
                  </div>
                ) : null}
                {nextStatus === "completed" ? (
                  <div className="field field-light task-status-evidence">
                    <label htmlFor={`${taskId}-completion-note`}>Evidência da conclusão</label>
                    <textarea
                      id={`${taskId}-completion-note`}
                      name="completion_note"
                      placeholder="Ex.: Proposta enviada por email e receção confirmada."
                      required
                      rows={4}
                    />
                  </div>
                ) : null}
                <footer>
                  <button className="button-secondary" onClick={() => setOpen(false)} type="button">
                    Cancelar
                  </button>
                  <FormSubmit idleLabel="Guardar estado" pendingLabel="A atualizar…" />
                </footer>
              </form>
            ) : null}
          </section>
        </div>
      ) : null}
    </>
  );
}
