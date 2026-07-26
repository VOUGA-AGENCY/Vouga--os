"use client";

import { X } from "lucide-react";
import { useState } from "react";

import {
  availableProjectTransitions,
  PROJECT_STATUS_LABELS,
  type ProjectStatus,
} from "@/domain/projects/project";
import { FormSubmit } from "@/foundation/ui/form-controls";

import { transitionProjectAction } from "./actions";

export function ProjectStatusUpdate({
  projectId,
  status,
}: {
  projectId: string;
  status: ProjectStatus;
}) {
  const options = availableProjectTransitions(status);
  const [open, setOpen] = useState(false);
  const [nextStatus, setNextStatus] = useState<ProjectStatus | null>(null);
  if (!options.length) return null;

  return (
    <>
      <button className="button-secondary" onClick={() => setOpen(true)} type="button">
        Atualizar estado
      </button>
      {open ? (
        <div className="crm-modal-backdrop" onMouseDown={() => setOpen(false)}>
          <section
            aria-labelledby={`${projectId}-status-title`}
            aria-modal="true"
            className="crm-interaction-modal task-status-modal project-status-modal"
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
          >
            <header>
              <h2 id={`${projectId}-status-title`}>Atualizar estado</h2>
              <button aria-label="Fechar" onClick={() => setOpen(false)} type="button">
                <X aria-hidden="true" />
              </button>
            </header>
            <div className="task-status-options" role="group" aria-label="Novo estado">
              {options.map((option) => (
                <button
                  aria-pressed={nextStatus === option}
                  className={`button-secondary task-status-option${nextStatus === option ? " active" : ""}`}
                  key={option}
                  onClick={() => setNextStatus(option)}
                  type="button"
                >
                  {PROJECT_STATUS_LABELS[option]}
                </button>
              ))}
            </div>
            {nextStatus ? (
              <form
                action={transitionProjectAction.bind(null, projectId)}
                className="task-status-form"
              >
                <input name="next_status" type="hidden" value={nextStatus} />
                <p className="project-status-confirmation">
                  {nextStatus === "closed"
                    ? "Ao encerrar, o Project deixa de poder ser editado."
                    : `O Project passa para ${PROJECT_STATUS_LABELS[nextStatus]}.`}
                </p>
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
