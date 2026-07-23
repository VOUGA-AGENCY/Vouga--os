import { notFound } from "next/navigation";
import { createRoadmapModule } from "@/foundation/composition/roadmap";
import { updateRoadmapItemAction } from "../../actions";
import { RoadmapItemForm } from "../../roadmap-item-form";
export default async function EditRoadmapItemPage({
  params,
}: {
  params: Promise<{ roadmapItemId: string }>;
}) {
  const { roadmapItemId } = await params;
  const { service, readModel } = await createRoadmapModule();
  const [item, options] = await Promise.all([
    readModel.findById(roadmapItemId),
    service.getFormOptions(),
  ]);
  if (!item || item.lifecycleStatus !== "active") notFound();
  return (
    <main className="workspace-main module-main module-form-main object-form-page object-form-roadmap">
      <p className="eyebrow">Roadmap</p>
      <h1 className="display">{item.title}</h1>
      <p className="workspace-intro">Direção e evidência.</p>
      <RoadmapItemForm
        action={updateRoadmapItemAction.bind(null, roadmapItemId)}
        item={item}
        options={options}
      />
    </main>
  );
}
