import type { Viewport } from "next";
import { notFound } from "next/navigation";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { getChat, listMessages } from "@/chats/store.ts";
import { ChatView } from "@/components/chat-view.tsx";
import { BackLink } from "@/components/ui/back-link.tsx";
import { extraTag } from "@/flags/flags.ts";
import { CHAT_COPY, CHAT_NAME_COPY } from "@/ui/copy/chat.ts";
import { RenameChatForm } from "./rename-chat-form.tsx";

// An on-screen keyboard shrinks the page rather than covering its bottom, so
// the pinned header and the composer both stay above it. Every other page
// keeps the browser's default.
export const viewport: Viewport = { interactiveWidget: "resizes-content" };

// The chat under a header pinned to the top of the window, so the way back
// to the project and the chat's name stay in reach in a long chat. Renaming
// sits just below the header and scrolls away with the conversation. The
// conversation is keyed by its last message, so when the chat learns that a
// message it resent was answered already and refreshes, it starts again from
// the saved conversation, answer included.
export default async function ChatPage({
  params,
}: PageProps<"/chats/[chatId]">): Promise<JSX.Element> {
  const { chatId } = await params;
  const user = await requireUser();
  const chat = await getChat(user.id, chatId);
  if (chat === undefined) {
    notFound();
  }
  const messages = await listMessages(user.id, chat.id);
  const personaName = chat.persona.name;

  return (
    <>
      <header className="chat-header" {...extraTag("pinned-chat-header")}>
        <BackLink href={`/projects/${chat.projectId}`}>
          {chat.projectName}
        </BackLink>
        <h1 className="page-heading">
          <span className="chat-header-name">
            {chat.name ?? CHAT_NAME_COPY.fallback}
          </span>{" "}
          <span className="chat-header-persona">
            {CHAT_COPY.heading(personaName)}
          </span>
        </h1>
      </header>
      {/* Closer to the heading it renames than the column's gap. */}
      <div className="-mt-5">
        <RenameChatForm chatId={chat.id} name={chat.name} />
      </div>
      <ChatView
        chatId={chat.id}
        key={messages.at(-1)?.id}
        initialMessages={messages}
        personaName={personaName}
      />
    </>
  );
}
