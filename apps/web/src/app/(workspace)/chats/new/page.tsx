import type { Metadata } from "next";
import type { JSX } from "react";
import { choicesForChat } from "@/activities/activity-choice.ts";
import { activityChoices } from "@/activities/activity-choices.ts";
import { DEFAULT_ACTIVITY_ID } from "@/activities/index.ts";
import { requireUser } from "@/auth/current-user.ts";
import { ownBuddyChoices } from "@/buddies/own-buddy-choices.ts";
import { NewChatForm } from "@/components/new-chat-form.tsx";
import { parseProjectId } from "@/ids.ts";
import { listProjects } from "@/projects/store.ts";
import { NEW_CHAT_COPY } from "@/ui/copy/chat.ts";

// A search parameter given once; repeated or missing ones count as absent.
function singleValue(
  parameter: string | string[] | undefined,
): string | undefined {
  if (typeof parameter === "string") {
    return parameter;
  }
  return undefined;
}

export const metadata: Metadata = { title: NEW_CHAT_COPY.title };

// The new chat page: the start page of every activity but the interview,
// at /chats/new?activity=ACTIVITY_ID, with the activity chosen, and the
// project chosen with projectId=PROJECT_ID. An activity that is none of
// hers, such as the interview, whose start page is the new project form,
// reads as the default activity.
export default async function NewChatPage({
  searchParams,
}: PageProps<"/chats/new">): Promise<JSX.Element> {
  const { projectId, activity } = await searchParams;
  const user = await requireUser();
  const [projects, choices, userBuddies] = await Promise.all([
    listProjects(user.id),
    activityChoices(user.id),
    ownBuddyChoices(),
  ]);
  const activities = choicesForChat(choices, { hasProject: false });
  const chosenActivity = activities.find(
    ({ id }) => id === singleValue(activity),
  );
  return (
    <NewChatForm
      activities={activities}
      projects={projects.map(({ id, name }) => ({ id, name }))}
      selectedActivityId={chosenActivity?.id ?? DEFAULT_ACTIVITY_ID}
      selectedProjectId={parseProjectId(singleValue(projectId) ?? "")}
      userBuddies={userBuddies}
    />
  );
}
