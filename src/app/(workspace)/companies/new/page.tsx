import { redirect } from "next/navigation";

import { getAuthenticatedUser } from "@/application/auth/current-user";
import { createCompanyModule } from "@/foundation/composition/companies";

import { createCompanyAction } from "../actions";
import { CompanyForm } from "../company-form";

export default async function NewCompanyPage({
  searchParams,
}: {
  searchParams: Promise<{ prospecting?: string; returnTo?: string }>;
}) {
  const query = await searchParams;
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");

  const { service } = await createCompanyModule();
  const owners = await service.listActiveOwners();

  return (
    <main className="workspace-main module-main module-form-main object-form-page object-form-company">
      <h1 className="display">Nova organização</h1>

      {owners.length === 0 ? (
        <section className="inline-state inline-state-error">
          <h2>Não existe um owner ativo</h2>
          <p>
            A identidade autenticada ainda não foi sincronizada com o suporte mínimo de Members.
          </p>
        </section>
      ) : (
        <CompanyForm
          action={createCompanyAction}
          defaultOwnerId={user.id}
          defaultProspectingStage={query.prospecting === "1" ? "to_contact" : undefined}
          owners={owners}
          returnTo={query.returnTo}
        />
      )}
    </main>
  );
}
