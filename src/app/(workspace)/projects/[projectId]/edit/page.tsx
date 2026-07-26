import { notFound } from "next/navigation";

import { createProjectModule } from "@/foundation/composition/projects";

import { updateProjectAction } from "../../actions";
import { ProjectForm } from "../../project-form";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { readModel, service } = await createProjectModule();
  const [project, options] = await Promise.all([
    readModel.findById(projectId),
    service.getFormOptions(),
  ]);
  if (!project || project.status === "closed") notFound();

  return (
    <main className="workspace-main module-main module-form-main object-form-page project-form-page">
      <p className="eyebrow">Projects</p>
      <h1 className="display">{project.name}</h1>
      <ProjectForm
        action={updateProjectAction.bind(null, project.id)}
        options={options}
        project={project}
      />
    </main>
  );
}
