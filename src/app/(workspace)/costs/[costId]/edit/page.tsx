import { notFound } from "next/navigation";
import { createCostModule } from "@/foundation/composition/costs";
import { updateCostAction } from "../../actions";
import { CostForm } from "../../cost-form";
export default async function EditCostPage({ params }: { params: Promise<{ costId: string }> }) {
  const { costId } = await params;
  const { service, readModel } = await createCostModule();
  const [cost, options] = await Promise.all([readModel.findById(costId), service.getFormOptions()]);
  if (!cost || ["paid", "ended", "cancelled"].includes(cost.status)) notFound();
  return (
    <main className="workspace-main module-main module-form-main object-form-page object-form-cost">
      <p className="eyebrow">Costs</p>
      <h1 className="display">{cost.title}</h1>
      <p className="workspace-intro">Pagamento e recorrência.</p>
      <CostForm action={updateCostAction.bind(null, costId)} cost={cost} options={options} />
    </main>
  );
}
