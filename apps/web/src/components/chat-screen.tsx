import type { UIMessage } from "ai";
import type { JSX, ReactNode } from "react";
import { RenameChatForm } from "@/app/(workspace)/chats/[chatId]/rename-chat-form.tsx";
import type { Chat } from "@/chats/chat-rows.ts";
import { ChatView } from "@/components/chat-view.tsx";
import { BackLink } from "@/components/ui/back-link.tsx";
import { extraTag } from "@/flags/flags.ts";
import { STANDALONE_CHATS_COPY } from "@/ui/copy/chat.ts";

// The way back to the list this chat belongs to.
function chatListLink({ project }: Chat): ReactNode {
  if (project === undefined) {
    return <BackLink href="/chat">{STANDALONE_CHATS_COPY.backLink}</BackLink>;
  }
  return <BackLink href={`/projects/${project.id}`}>{project.name}</BackLink>;
}

// A chat with its editable title, conversation and composer.
function ChatScreen({
  chat,
  messages,
}: {
  readonly chat: Chat;
  readonly messages: UIMessage[];
}): JSX.Element {
  const buddyName = chat.buddy.name;
  return (
    <>
      <header className="chat-header" {...extraTag("pinned-chat-header")}>
        {chatListLink(chat)}
        <RenameChatForm
          chatId={chat.id}
          name={chat.name}
          buddyName={buddyName}
        />
      </header>
      <ChatView
        chatId={chat.id}
        key={messages.at(-1)?.id}
        initialMessages={messages}
        buddyName={buddyName}
      />
    </>
  );
}

export { ChatScreen };
