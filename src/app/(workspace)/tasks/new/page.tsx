import { createTaskModule, loadTaskGoogleEventOptions } from "@/foundation/composition/tasks";
import { createTaskAction } from "../actions";
import { TaskForm } from "../task-form";
export default async function NewTaskPage({
  searchParams,
}: {
  searchParams: Promise<{
    meeting?: string;
    googleCalendar?: string;
    googleEvent?: string;
    returnTo?: string;
  }>;
}) {
  const { meeting, googleCalendar, googleEvent, returnTo } = await searchParams;
  const { service } = await createTaskModule();
  const googleEvents = await loadTaskGoogleEventOptions();
  const options = await service.getFormOptions(googleEvents);
  const defaultGoogleEvent = googleEvents.find(
    (item) => item.calendarId === googleCalendar && item.eventId === googleEvent,
  );
  return (
    <main className="workspace-main module-main module-form-main object-form-page object-form-task">
      <p className="eyebrow">Tasks</p>
      <h1 className="display">New task</h1>
      <TaskForm
        action={createTaskAction}
        defaultMeetingId={meeting}
        defaultGoogleEvent={defaultGoogleEvent}
        options={options}
        returnTo={returnTo}
      />
    </main>
  );
}
