import { notFound } from "next/navigation";

import { createCompanyModule } from "@/foundation/composition/companies";

import { updateCompanyAction } from "../../actions";
import { CompanyForm } from "../../company-form";

export default async function EditCompanyPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const { readModel, service } = await createCompanyModule();
  const [company, owners] = await Promise.all([
    readModel.findById(companyId),
    service.listActiveOwners(),
  ]);
  if (!company) notFound();

  const action = updateCompanyAction.bind(null, company.id);

  return (
    <main className="workspace-main module-main module-form-main object-form-page object-form-company">
      <h1 className="display">{company.name}</h1>
      <CompanyForm action={action} company={company} owners={owners} />
    </main>
  );
}
