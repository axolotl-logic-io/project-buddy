import Link from "next/link";
import { notFound } from "next/navigation";
import type { JSX } from "react";
import { getChat, listMessages } from "@/chats/store.ts";
import { ChatView } from "@/components/chat-view.tsx";
import { getPersona } from "@/personas/index.ts";
import { COPY } from "@/ui/copy.ts";
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
  const personaName = getPersona(chat.personaId)?.name ?? chat.personaId;

  return (
    <>
      <Link className="back-link" href={`/projects/${chat.projectId}`}>
        {chat.projectName}
      </Link>
      <div className="flex flex-col gap-2">
        <h1 className="page-heading">
          {chat.name ?? COPY.chatName.fallback}{" "}
          <span className="block font-normal text-base text-muted tracking-normal">
            {COPY.chat.heading(personaName)}
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
