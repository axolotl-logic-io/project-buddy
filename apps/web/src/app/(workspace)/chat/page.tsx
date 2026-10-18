import type { Metadata } from "next";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { ownBuddyChoices } from "@/buddies/own-buddy-choices.ts";
import { listCentralChats } from "@/chats/central-chat.ts";
import { ChatList } from "@/components/chat-list.tsx";
import { NewStandaloneChatForm } from "@/components/new-standalone-chat-form.tsx";
import { STANDALONE_CHATS_COPY } from "@/ui/copy/chat.ts";

export const metadata: Metadata = { title: STANDALONE_CHATS_COPY.title };

export default async function StandaloneChatsPage(): Promise<JSX.Element> {
  const user = await requireUser();
  const [chats, userBuddies] = await Promise.all([
    listCentralChats(user.id),
    ownBuddyChoices(),
  ]);
  return (
    <>
      <section className="panel flex flex-col gap-5">
        <h2 className="section-heading">{STANDALONE_CHATS_COPY.newHeading}</h2>
        <NewStandaloneChatForm userBuddies={userBuddies} />
      </section>
      <section className="flex flex-col gap-4">
        <h2 className="section-heading">{STANDALONE_CHATS_COPY.listHeading}</h2>
        <ChatList chats={chats} emptyMessage={STANDALONE_CHATS_COPY.noChats} />
      </section>
    </>
  );
}
