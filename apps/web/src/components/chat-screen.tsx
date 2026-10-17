import type { UIMessage } from "ai";
import type { JSX, ReactNode } from "react";
import { RenameChatForm } from "@/app/(workspace)/chats/[chatId]/rename-chat-form.tsx";
import type { FoundChat } from "@/chats/chat-rows.ts";
import { ChatView } from "@/components/chat-view.tsx";
import { BackLink } from "@/components/ui/back-link.tsx";
import { extraTag } from "@/flags/flags.ts";
import { CHAT_COPY, CHAT_NAME_COPY } from "@/ui/copy/chat.ts";

// The way back to a chat's project; a central chat, in no project, has none.
function projectLink(chat: FoundChat): ReactNode {
  switch (chat.kind) {
    case "project":
      return (
        <BackLink href={`/projects/${chat.projectId}`}>
          {chat.projectName}
        </BackLink>
      );
    case "central":
      return null;
    default: {
      const unhandled: never = chat;
      return unhandled;
    }
  }
}

// A chat's whole screen, in a project or central: the chat under a header
// pinned to the top of the window, so the way back to the project, if the
// chat is in one, and the chat's name stay in reach in a long chat. Renaming
// sits just below the header and scrolls away with the conversation. The
// conversation is keyed by its last message, so when the chat learns that a
// message it resent was answered already and refreshes, it starts again from
// the saved conversation, answer included.
function ChatScreen({
  chat,
  messages,
}: {
  readonly chat: FoundChat;
  readonly messages: UIMessage[];
}): JSX.Element {
  const buddyName = chat.buddy.name;
  return (
    <>
      <header className="chat-header" {...extraTag("pinned-chat-header")}>
        {projectLink(chat)}
        <h1 className="page-heading">
          <span className="chat-header-name">
            {chat.name ?? CHAT_NAME_COPY.fallback}
          </span>{" "}
          <span className="chat-header-buddy">
            {CHAT_COPY.heading(buddyName)}
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
        buddyName={buddyName}
      />
    </>
  );
}

export { ChatScreen };
