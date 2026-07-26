import { createCostModule } from "@/foundation/composition/costs";
import { createCostAction } from "../actions";
import { CostForm } from "../cost-form";
export default async function NewCostPage() {
  const { service } = await createCostModule();
  const options = await service.getFormOptions();
  return (
    <main className="workspace-main module-main module-form-main object-form-page object-form-cost">
      <h1 className="display">Novo custo</h1>
      <CostForm action={createCostAction} options={options} />
    </main>
  );
}
