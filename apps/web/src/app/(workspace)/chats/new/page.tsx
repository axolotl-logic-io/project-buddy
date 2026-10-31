import type { Metadata } from "next";
import type { JSX } from "react";
import { DEFAULT_ACTIVITY_ID } from "@/activities/activity.ts";
import { requireUser } from "@/auth/current-user.ts";
import { newChatChoices } from "@/chats/new-chat-choices.ts";
import { NewChatForm } from "@/components/new-chat-form.tsx";
import { parseProjectId } from "@/ids.ts";
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

// The new chat page: the start page of every activity, at
// /chats/new?activity=ACTIVITY_ID, with the activity chosen, and the project
// chosen with projectId=PROJECT_ID. The project interview chooses a new
// project instead. An activity that is none of hers reads as the default
// activity.
export default async function NewChatPage({
  searchParams,
}: PageProps<"/chats/new">): Promise<JSX.Element> {
  const { projectId, activity } = await searchParams;
  const user = await requireUser();
  const choices = await newChatChoices(user.id);
  const chosenActivity = choices.activities.find(
    ({ id }) => id === singleValue(activity),
  );
  return (
    <NewChatForm
      {...choices}
      selectedActivityId={chosenActivity?.id ?? DEFAULT_ACTIVITY_ID}
      selectedProjectId={parseProjectId(singleValue(projectId) ?? "")}
    />
  );
}
