import { createDecisionModule } from "@/foundation/composition/decisions";

import { createDecisionAction } from "../actions";
import { DecisionForm } from "../decision-form";

export default async function NewDecisionPage({
  searchParams,
}: {
  searchParams: Promise<{ meeting?: string }>;
}) {
  const { meeting } = await searchParams;
  const { service } = await createDecisionModule();
  const options = await service.getFormOptions();

  return (
    <main className="workspace-main module-main module-form-main object-form-page object-form-decision">
      <p className="eyebrow">Decisions</p>
      <h1 className="display">New decision</h1>
      <p className="workspace-intro">Escolha, motivo e impacto.</p>
      <DecisionForm
        action={createDecisionAction}
        decidedOn={todayInLisbon()}
        defaultOriginMeetingId={meeting}
        options={options}
      />
    </main>
  );
}

function todayInLisbon() {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Lisbon",
    year: "numeric",
  }).format(new Date());
}
