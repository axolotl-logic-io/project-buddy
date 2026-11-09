// What the new-chat form offers where the user chooses its project: on the
// new chat page and on the Chats page.
import type { ActivityChoice } from "@/activities/activity-choice.ts";
import { activityChoices } from "@/activities/activity-choices.ts";
import type { OwnConstructChoice } from "@/constructs/construct-store.ts";
import { ownConstructChoices } from "@/constructs/own-construct-choices.ts";
import type { ProjectId, UserId } from "@/ids.ts";
import { activeProjects } from "@/projects/active-projects.ts";

// The form offers accessible Active quests.
interface NewChatChoices {
  readonly projects: readonly {
    readonly id: ProjectId;
    readonly name: string;
  }[];
  readonly activities: readonly ActivityChoice[];
  readonly userConstructs: readonly OwnConstructChoice[];
}

// Accessible Active quests, newest first; every available activity, for new or
// existing projects; and the constructs the owner made,
// oldest first.
async function newChatChoices(owner: UserId): Promise<NewChatChoices> {
  const [projects, activities, userConstructs] = await Promise.all([
    activeProjects(owner),
    activityChoices(owner),
    ownConstructChoices(),
  ]);
  return {
    projects: projects.map(({ id, name }) => ({ id, name })),
    activities,
    userConstructs,
  };
}

export type { NewChatChoices };
export { newChatChoices };
