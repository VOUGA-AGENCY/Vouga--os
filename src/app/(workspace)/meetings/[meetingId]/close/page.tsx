import { notFound } from "next/navigation";

import { createMeetingModule } from "@/foundation/composition/meetings";
import { safeWorkspaceReturnTo } from "@/foundation/navigation/return-to";

import { CloseMeetingForm } from "./close-form";

export default async function CloseMeetingPage({
  params,
  searchParams,
}: {
  params: Promise<{ meetingId: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { meetingId } = await params;
  const { returnTo } = await searchParams;
  const { readModel } = await createMeetingModule();
  const meeting = await readModel.findById(meetingId, new Date().toISOString());
  if (!meeting || meeting.kind !== "meeting" || meeting.status === "closed" || meeting.status === "cancelled") {
    notFound();
  }
  const backHref = safeWorkspaceReturnTo(returnTo, `/meetings/${meetingId}`);

  return (
    <main className="workspace-main module-main module-form-main object-form-page object-form-meeting">
      <p className="eyebrow">Meetings</p>
      <h1 className="display">Meeting output</h1>
      <p className="workspace-intro">O que ficou decidido ou aprendido.</p>
      <CloseMeetingForm meetingId={meetingId} returnTo={backHref} />
    </main>
  );
}
