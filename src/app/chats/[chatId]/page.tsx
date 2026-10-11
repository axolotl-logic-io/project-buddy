import Link from "next/link";
import { notFound } from "next/navigation";
import type { JSX } from "react";
import { getChat, listMessages } from "@/chats/store.ts";
import { ChatView } from "@/components/chat-view.tsx";
import { getPersona } from "@/personas/index.ts";
import { COPY } from "@/ui/copy.ts";

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
      <Link
        className="text-sm underline underline-offset-2"
        href={`/projects/${chat.projectId}`}
      >
        {chat.projectName}
      </Link>
      <h1 className="font-semibold text-3xl tracking-tight">
        {COPY.chat.heading(personaName)}
      </h1>
      <ChatView
        chatId={chat.id}
        initialMessages={messages}
        personaName={personaName}
      />
    </>
  );
}
