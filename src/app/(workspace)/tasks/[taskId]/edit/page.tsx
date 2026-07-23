import { notFound } from "next/navigation";
import { createTaskModule } from "@/foundation/composition/tasks";
import { updateTaskAction } from "../../actions";
import { TaskForm } from "../../task-form";
export default async function EditTaskPage({ params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params;
  const { readModel, service } = await createTaskModule();
  const [task, options] = await Promise.all([readModel.findById(taskId), service.getFormOptions()]);
  if (!task || task.status === "completed" || task.status === "cancelled") notFound();
  return (
    <main className="workspace-main module-main module-form-main object-form-page object-form-task">
      <p className="eyebrow">Tasks</p>
      <h1 className="display">{task.title}</h1>
      <TaskForm action={updateTaskAction.bind(null, task.id)} options={options} task={task} />
    </main>
  );
}
