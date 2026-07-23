"use server";

import { redirect } from "next/navigation";

import { getAuthenticatedUser } from "@/application/auth/current-user";
import { getGoogleDriveDocumentErrorMessage } from "@/application/google/google-drive-document-service";
import { createGoogleIntegrationModule } from "@/foundation/composition/google";
import { withFeedback } from "@/foundation/ui/feedback";

export async function createGoogleDocumentAction(formData: FormData): Promise<void> {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");

  try {
    const document = await (await createGoogleIntegrationModule()).documentService.createDocument(
      user.id,
      String(formData.get("title") ?? ""),
    );
    redirect(
      withFeedback(
        `/notes?created=${encodeURIComponent(document.id)}`,
        "Google Doc criado.",
      ),
    );
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect(withFeedback("/notes", getGoogleDriveDocumentErrorMessage(error), "error"));
  }
}
