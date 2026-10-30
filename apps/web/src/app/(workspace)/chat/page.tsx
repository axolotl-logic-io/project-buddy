import type { Metadata } from "next";
import type { JSX } from "react";
import { DEFAULT_ACTIVITY_ID } from "@/activities/index.ts";
import { requireUser } from "@/auth/current-user.ts";
import { listAllChats } from "@/chats/all-chats.ts";
import { newChatChoices } from "@/chats/new-chat-choices.ts";
import { ChatProjectFilter } from "@/components/chat-project-filter.tsx";
import { NewChatForm } from "@/components/new-chat-form.tsx";
import { PROJECT_ID } from "@/ids.ts";
import { STANDALONE_CHATS_COPY } from "@/ui/copy/chat.ts";

export const metadata: Metadata = { title: STANDALONE_CHATS_COPY.title };

export default async function StandaloneChatsPage({
  searchParams,
}: PageProps<"/chat">): Promise<JSX.Element> {
  const { project } = await searchParams;
  const user = await requireUser();
  const [choices, chats] = await Promise.all([
    newChatChoices(user.id),
    listAllChats(user.id),
  ]);
  const { projects } = choices;
  const projectId = PROJECT_ID.safeParse(project).data;
  const selected = projects.find((choice) => choice.id === projectId);
  return (
    <>
      <section className="panel flex flex-col gap-5">
        <h2 className="section-heading">{STANDALONE_CHATS_COPY.newHeading}</h2>
        <NewChatForm {...choices} selectedActivityId={DEFAULT_ACTIVITY_ID} />
      </section>
      <section className="flex flex-col gap-4">
        <h2 className="section-heading">{STANDALONE_CHATS_COPY.listHeading}</h2>
        <ChatProjectFilter
          key={selected?.id ?? ""}
          projects={projects}
          chats={chats}
          selectedProjectId={selected?.id}
        />
      </section>
    </>
  );
}
