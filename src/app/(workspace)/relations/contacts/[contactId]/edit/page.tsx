import { notFound } from "next/navigation";
import { createRelationsModule } from "@/foundation/composition/relations";
import { updateContactAction } from "../../../actions";
import { ContactForm } from "../../../contact-form";
export default async function EditContactPage({
  params,
}: {
  params: Promise<{ contactId: string }>;
}) {
  const { contactId } = await params;
  const { service, readModel } = await createRelationsModule();
  const [contact, options] = await Promise.all([
    readModel.findContact(contactId),
    service.listFormOptions(),
  ]);
  if (!contact) notFound();
  return (
    <main className="workspace-main module-main object-form-page">
      <h1 className="display">{contact.displayName}</h1>
      <ContactForm
        action={updateContactAction.bind(null, contactId)}
        contact={contact}
        members={options.members}
        companies={options.companies}
      />
    </main>
  );
}
