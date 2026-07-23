import { notFound } from "next/navigation";

import { createDecisionModule } from "@/foundation/composition/decisions";

import { reviewDecisionAction } from "../../actions";
import { DecisionForm } from "../../decision-form";

export default async function ReviewDecisionPage({
  params,
}: {
  params: Promise<{ decisionId: string }>;
}) {
  const { decisionId } = await params;
  const { readModel, service } = await createDecisionModule();
  const [previous, options] = await Promise.all([
    readModel.findById(decisionId),
    service.getFormOptions(),
  ]);
  if (!previous || previous.status !== "current") notFound();

  return (
    <main className="workspace-main module-main module-form-main object-form-page object-form-decision">
      <p className="eyebrow">Decisions</p>
      <h1 className="display">{previous.title}</h1>
      <p className="workspace-intro">Nova revisão e impacto.</p>
      <DecisionForm
        action={reviewDecisionAction.bind(null, previous.id)}
        decidedOn={todayInLisbon()}
        options={options}
        previous={previous}
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
