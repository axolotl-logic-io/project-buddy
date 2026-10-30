// What the new-chat form offers, wherever it is shown: on the new chat page,
// on the Chats page and on a project's page.
import {
  type ActivityChoice,
  choicesForChat,
} from "@/activities/activity-choice.ts";
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

// The owner's projects, newest first; the activities a chat can start in,
// which leave out the interview, since its start page is the new project
// form; and the buddies the owner made, oldest first.
async function newChatChoices(owner: UserId): Promise<NewChatChoices> {
  const [projects, activities, userBuddies] = await Promise.all([
    listProjects(owner),
    activityChoices(owner),
    ownBuddyChoices(),
  ]);
  return {
    projects: projects.map(({ id, name }) => ({ id, name })),
    activities: choicesForChat(activities, { hasProject: false }),
    userBuddies,
  };
}

export type { NewChatChoices };
export { newChatChoices };
