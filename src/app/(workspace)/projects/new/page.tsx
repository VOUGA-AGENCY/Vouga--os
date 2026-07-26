import { createProjectModule } from "@/foundation/composition/projects";

import { createProjectAction } from "../actions";
import { ProjectForm } from "../project-form";

export default async function NewProjectPage() {
  const { service } = await createProjectModule();
  const options = await service.getFormOptions();

  return (
    <main className="workspace-main module-main module-form-main object-form-page project-form-page">
      <p className="eyebrow">Work</p>
      <h1 className="display">Novo Project</h1>
      <ProjectForm action={createProjectAction} options={options} />
    </main>
  );
}
