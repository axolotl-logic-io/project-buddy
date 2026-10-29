import type { Metadata } from "next";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { ownBuddyChoices } from "@/buddies/own-buddy-choices.ts";
import { listAllChats } from "@/chats/all-chats.ts";
import { ChatProjectFilter } from "@/components/chat-project-filter.tsx";
import { NewStandaloneChatForm } from "@/components/new-standalone-chat-form.tsx";
import { PROJECT_ID } from "@/ids.ts";
import { listProjects } from "@/projects/store.ts";
import { STANDALONE_CHATS_COPY } from "@/ui/copy/chat.ts";

export const metadata: Metadata = { title: STANDALONE_CHATS_COPY.title };

export default async function StandaloneChatsPage({
  searchParams,
}: PageProps<"/chat">): Promise<JSX.Element> {
  const { project } = await searchParams;
  const user = await requireUser();
  const [projects, userBuddies] = await Promise.all([
    listProjects(user.id),
    ownBuddyChoices(),
  ]);
  const projectId = PROJECT_ID.safeParse(project).data;
  const selected = projects.find((choice) => choice.id === projectId);
  const chats = await listAllChats(user.id);
  return (
    <>
      <section className="panel flex flex-col gap-5">
        <h2 className="section-heading">{STANDALONE_CHATS_COPY.newHeading}</h2>
        <NewStandaloneChatForm userBuddies={userBuddies} />
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
