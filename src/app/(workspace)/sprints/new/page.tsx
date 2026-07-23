import { createSprintModule } from "@/foundation/composition/sprints";
import { createSprintAction } from "../actions";
import { SprintForm } from "../sprint-form";
export default async function NewSprintPage() {
  const { service } = await createSprintModule();
  const options = await service.getFormOptions();
  return (
    <main className="workspace-main module-main module-form-main object-form-page object-form-sprint">
      <p className="eyebrow">Sprints</p>
      <h1 className="display">New sprint</h1>
      <p className="workspace-intro">Ciclo e compromisso.</p>
      <SprintForm action={createSprintAction} options={options} />
    </main>
  );
}
