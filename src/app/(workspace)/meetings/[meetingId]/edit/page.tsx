import { notFound } from "next/navigation";

import { createMeetingModule } from "@/foundation/composition/meetings";

import { updateMeetingAction } from "../../actions";
import { MeetingForm } from "../../meeting-form";

export default async function EditMeetingPage({
  params,
}: {
  params: Promise<{ meetingId: string }>;
}) {
  const { meetingId } = await params;
  const { readModel, service } = await createMeetingModule();
  const [meeting, options] = await Promise.all([
    readModel.findById(meetingId, new Date().toISOString()),
    service.getFormOptions(),
  ]);
  if (!meeting) notFound();
  if (meeting.status === "closed" || meeting.status === "cancelled") {
    notFound();
  }
  const action = updateMeetingAction.bind(null, meeting.id);

  return (
    <main className="workspace-main module-main module-form-main object-form-page object-form-meeting">
      <p className="eyebrow">Meetings</p>
      <h1 className="display">{meeting.title}</h1>
      <MeetingForm
        action={action}
        defaults={{ startsAt: meeting.startsAt, endsAt: meeting.endsAt }}
        meeting={meeting}
        options={options}
      />
    </main>
  );
}
