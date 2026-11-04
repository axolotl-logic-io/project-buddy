import type { Metadata } from "next";
import type { JSX } from "react";
import { DEFAULT_ACTIVITY_ID } from "@/activities/activity.ts";
import { requireUser } from "@/auth/current-user.ts";
import { newChatChoices } from "@/chats/new-chat-choices.ts";
import { NewChatForm } from "@/components/new-chat-form.tsx";
import { TodaySection } from "@/components/today-section.tsx";
import { parseProjectId } from "@/ids.ts";
import { hasToday } from "@/today/today.ts";
import { readToday } from "@/today/today-store.ts";
import { NEW_CHAT_COPY } from "@/ui/copy/chat.ts";

const FORM_HEADING_ID = "new-chat-heading";

// A search parameter given once; repeated or missing ones count as absent.
function singleValue(
  parameter: string | string[] | undefined,
): string | undefined {
  if (typeof parameter === "string") {
    return parameter;
  }
  return undefined;
}

export const metadata: Metadata = { title: "Today · Project Buddy" };

// The new chat page, the landing page: the start page of every activity, at
// /chats/new?activity=ACTIVITY_ID, with the activity chosen, and the project
// chosen with projectId=PROJECT_ID. The project interview chooses a new
// project instead. An activity that is none of theirs reads as the default
// activity. Above the form, the Today section shows what is waiting for the
// user, under the page's heading; a user with nothing waiting sees only the
// form, under its own.
export default async function NewChatPage({
  searchParams,
}: PageProps<"/chats/new">): Promise<JSX.Element> {
  const { projectId, activity } = await searchParams;
  const user = await requireUser();
  const [choices, today] = await Promise.all([
    newChatChoices(user.id),
    readToday(user.id),
  ]);
  const chosenActivity = choices.activities.find(
    ({ id }) => id === singleValue(activity),
  );
  const form = (
    <NewChatForm
      {...choices}
      selectedActivityId={chosenActivity?.id ?? DEFAULT_ACTIVITY_ID}
      selectedProjectId={parseProjectId(singleValue(projectId) ?? "")}
    />
  );
  if (!hasToday(today)) {
    return (
      <>
        <h1 className="page-heading">{NEW_CHAT_COPY.heading}</h1>
        <div className="panel">{form}</div>
      </>
    );
  }
  return (
    <>
      <TodaySection today={today} />
      <section
        aria-labelledby={FORM_HEADING_ID}
        className="panel flex flex-col gap-5"
      >
        <h2 className="section-heading" id={FORM_HEADING_ID}>
          {NEW_CHAT_COPY.heading}
        </h2>
        {form}
      </section>
    </>
  );
}
