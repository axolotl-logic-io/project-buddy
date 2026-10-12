import { notFound } from "next/navigation";
import type { JSX } from "react";
import { getChat, listMessages } from "@/chats/store.ts";
import { ChatView } from "@/components/chat-view.tsx";
import { BackLink } from "@/components/ui/back-link.tsx";
import { getPersona } from "@/personas/index.ts";
import { CHAT_COPY, CHAT_NAME_COPY } from "@/ui/copy/chat.ts";
import { RenameChatForm } from "./rename-chat-form.tsx";

export default async function ChatPage({
  params,
}: PageProps<"/chats/[chatId]">): Promise<JSX.Element> {
  const { chatId } = await params;
  const chat = await getChat(chatId);
  if (chat === undefined) {
    notFound();
  }
  const messages = await listMessages(chat.id);
  const personaName = getPersona(chat.personaId).name;

  return (
    <>
      <BackLink href={`/projects/${chat.projectId}`}>
        {chat.projectName}
      </BackLink>
      <div className="flex flex-col gap-3">
        <h1 className="page-heading">
          {chat.name ?? CHAT_NAME_COPY.fallback}{" "}
          <span className="mt-1 block font-body font-normal text-base text-muted tracking-normal">
            {CHAT_COPY.heading(personaName)}
          </span>
        </h1>
        <RenameChatForm chatId={chat.id} name={chat.name} />
      </div>
      <ChatView
        chatId={chat.id}
        initialMessages={messages}
        personaName={personaName}
      />
    </>
  );
}
