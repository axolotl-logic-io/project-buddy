import { TaskRows } from "@/components/tasks/task-rows.tsx";
import { useTasks } from "@/components/tasks/use-tasks.ts";
import { Icon } from "@/components/ui/icon.tsx";
import type { WorkspaceSection } from "@/components/workspace-section.ts";
import { TASKS_COPY } from "@/ui/copy/tasks.ts";

// Metadata and the existing Control desk editor share one definition.
function useTaskSection(): WorkspaceSection[] {
  const tasks = useTasks();
  if (tasks === undefined) {
    return [];
  }
  return [
    {
      id: "tasks",
      label: TASKS_COPY.heading,
      icon: <Icon name="checklist" />,
      description: TASKS_COPY.intro,
      content: <TaskRows />,
      bucket: true,
    },
  ];
}

export { useTaskSection };
