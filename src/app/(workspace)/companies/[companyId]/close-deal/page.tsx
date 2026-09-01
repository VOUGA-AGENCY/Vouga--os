import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getAuthenticatedUser } from "@/application/auth/current-user";
import { createCompanyModule } from "@/foundation/composition/companies";
import { createProjectModule } from "@/foundation/composition/projects";
import { createRelationsModule } from "@/foundation/composition/relations";

import { closeDealAction } from "../../actions";
import { CloseDealForm } from "./close-deal-form";

export default async function CloseDealPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");

  const { companyId } = await params;
  const [companies, relations, projects] = await Promise.all([
    createCompanyModule(),
    createRelationsModule(),
    createProjectModule(),
  ]);

  const [company, allContacts, formOptions, existingProjects] = await Promise.all([
    companies.readModel.findById(companyId),
    relations.readModel.listContacts(),
    projects.service.getFormOptions(),
    projects.readModel.listByCompany(companyId),
  ]);

  if (!company) notFound();

  const companyContacts = allContacts.filter(
    (c) => c.status === "active" && c.companyId === companyId,
  );

  const boundAction = closeDealAction.bind(null, companyId);

  return (
    <main className="workspace-main module-main module-form-main object-form-page close-deal-page">
      <Link className="back-link" href={`/companies/${company.id}`}>
        ← Voltar a {company.name}
      </Link>
      <header className="page-header">
        <p className="eyebrow">Transição Comercial → Entrega</p>
        <h1 className="display">Fechar Contrato</h1>
        <p className="lead">
          Converte a prospeção com <strong>{company.name}</strong> num Project de entrega.
          O objetivo, contactos e relações ficam automaticamente vinculados ao novo workspace.
        </p>
      </header>

      <CloseDealForm
        action={boundAction}
        company={company}
        contacts={companyContacts}
        members={formOptions.members}
        existingProjects={existingProjects}
      />
    </main>
  );
}
