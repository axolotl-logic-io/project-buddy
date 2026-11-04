// What the new-chat form offers where the user chooses its project: on the
// new chat page and on the Chats page.
import type { ActivityChoice } from "@/activities/activity-choice.ts";
import { activityChoices } from "@/activities/activity-choices.ts";
import type { OwnBuddyChoice } from "@/buddies/buddy-store.ts";
import { ownBuddyChoices } from "@/buddies/own-buddy-choices.ts";
import type { ProjectId, UserId } from "@/ids.ts";
import { listProjects } from "@/projects/store.ts";

// The form's choices: ids and names alone, so nothing more reaches the
// browser.
interface NewChatChoices {
  readonly projects: readonly {
    readonly id: ProjectId;
    readonly name: string;
  }[];
  readonly activities: readonly ActivityChoice[];
  readonly userBuddies: readonly OwnBuddyChoice[];
}

// The owner's projects, newest first; every activity, including the project
// interview, for new or existing projects; and the buddies the owner made,
// oldest first.
async function newChatChoices(owner: UserId): Promise<NewChatChoices> {
  const [projects, activities, userBuddies] = await Promise.all([
    listProjects(owner),
    activityChoices(owner),
    ownBuddyChoices(),
  ]);
  return {
    projects: projects.map(({ id, name }) => ({ id, name })),
    activities,
    userBuddies,
  };
}

export type { NewChatChoices };
export { newChatChoices };
