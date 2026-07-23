import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/application/auth/current-user";
import { createRelationsModule } from "@/foundation/composition/relations";
import { createContactAction } from "../../actions";
import { ContactForm } from "../../contact-form";
export default async function NewContactPage({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string; prospecting?: string; returnTo?: string }>;
}) {
  const query = await searchParams;
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");
  const { service } = await createRelationsModule();
  const { members, companies } = await service.listFormOptions();
  return (
    <main className="workspace-main module-main object-form-page">
      <h1 className="display">Novo perfil</h1>
      <ContactForm
        action={createContactAction}
        members={members}
        companies={companies}
        defaultOwnerId={user.id}
        defaultCompanyId={query.companyId}
        prospectingContext={query.prospecting === "1"}
        returnTo={query.returnTo}
      />
    </main>
  );
}
