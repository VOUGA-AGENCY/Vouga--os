import { notFound, redirect } from "next/navigation";
import { createSprintModule } from "@/foundation/composition/sprints";
import { closeSprintAction } from "../../actions";
import { CloseSprintForm } from "./close-sprint-form";
export default async function CloseSprintPage({
  params,
}: {
  params: Promise<{ sprintId: string }>;
}) {
  const { sprintId } = await params;
  const { readModel } = await createSprintModule();
  const sprint = await readModel.findById(sprintId);
  if (!sprint) notFound();
  if (sprint.status !== "active") redirect(`/sprints/${sprint.id}`);
  return (
    <main className="workspace-main module-main module-form-main object-form-page object-form-sprint">
      <p className="eyebrow">Sprints</p>
      <h1 className="display">Close sprint</h1>
      <p className="workspace-intro">Resultado e destino do trabalho aberto.</p>
      <CloseSprintForm action={closeSprintAction.bind(null, sprint.id)} sprint={sprint} />
    </main>
  );
}
