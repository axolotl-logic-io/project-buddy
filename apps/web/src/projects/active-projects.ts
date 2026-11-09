import type { UserId } from "@/ids.ts";
import { listProjects, type Project } from "@/projects/store.ts";

// Quest dropdowns offer only accessible Active quests, newest first.
// Status tabs and direct pages use the unfiltered store instead.
async function activeProjects(user: UserId): Promise<Project[]> {
  return (await listProjects(user)).filter(
    (project) => project.status === "active",
  );
}

export { activeProjects };
