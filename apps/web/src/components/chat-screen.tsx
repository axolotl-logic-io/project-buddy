import type { JSX, ReactNode } from "react";
import { RenameChatForm } from "@/app/(workspace)/chats/[chatId]/rename-chat-form.tsx";
import type { Chat } from "@/chats/chat-rows.ts";
import { type ChatMessage, otherAuthorNames } from "@/chats/message-author.ts";
import { ChatView } from "@/components/chat-view.tsx";
import { BackLink } from "@/components/ui/back-link.tsx";
import { extraTag } from "@/flags/flags.ts";
import type { UserId } from "@/ids.ts";
import { STANDALONE_CHATS_COPY } from "@/ui/copy/chat.ts";

// The way back to the list this chat belongs to.
function chatListLink({ project }: Chat): ReactNode {
  if (project === undefined) {
    return <BackLink href="/chat">{STANDALONE_CHATS_COPY.backLink}</BackLink>;
  }
  return <BackLink href={`/projects/${project.id}`}>{project.name}</BackLink>;
}

// A chat with its editable title, conversation and composer, as viewer sees
// it: their own messages are theirs, and every other user message shows its
// author's name. stoppedReplyId is the last message's id when its reply
// stopped (readStoppedReply).
function ChatScreen({
  chat,
  messages,
  stoppedReplyId,
  viewer,
}: {
  readonly chat: Chat;
  readonly messages: ChatMessage[];
  readonly stoppedReplyId: string | undefined;
  readonly viewer: UserId;
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
        stoppedReplyId={stoppedReplyId}
        buddyName={buddyName}
        authorNames={otherAuthorNames(messages, viewer)}
      />
    </>
  );
}

export { ChatScreen };
