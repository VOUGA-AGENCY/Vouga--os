import { createRoadmapItemAction } from "../actions";
import { RoadmapItemForm } from "../roadmap-item-form";
import { createRoadmapModule } from "@/foundation/composition/roadmap";
export default async function NewRoadmapItemPage() {
  const { service } = await createRoadmapModule();
  const options = await service.getFormOptions();
  return (
    <main className="workspace-main module-main module-form-main object-form-page object-form-roadmap">
      <p className="eyebrow">Roadmap</p>
      <h1 className="display">New roadmap item</h1>
      <p className="workspace-intro">Direção e evidência.</p>
      <RoadmapItemForm action={createRoadmapItemAction} options={options} />
    </main>
  );
}
