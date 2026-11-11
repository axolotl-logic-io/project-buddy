import type { Metadata, Viewport } from "next";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { listMessages, readStoppedReply } from "@/chats/store.ts";
import { ChatScreen } from "@/components/chat-screen.tsx";
import { QuestFromChat } from "@/components/quest-from-chat.tsx";
import { privateChat } from "@/conversations/private-chat.ts";
import { questCreationChoices } from "@/projects/quest-creation-choices.ts";
import { chatSummaryDraft } from "@/start-work/chat-summary-draft.ts";
import { STANDALONE_CHAT_COPY } from "@/ui/copy/start-work.ts";

export const metadata: Metadata = { title: STANDALONE_CHAT_COPY.title };

// An on-screen keyboard shrinks the page rather than covering its bottom, so
// the pinned header and the composer both stay above it.
export const viewport: Viewport = { interactiveWidget: "resizes-content" };

// Chat: the user's one private conversation for talking without a goal,
// the same each time she opens it, with no list, name or chooser. Opening
// it makes the conversation if she has none, without an opening, so it
// spends nothing. Start a quest from this begins a quest from a summary she
// edits and confirms. Chat has no quest, so its replies never write a
// Journal, Plan or milestone.
export default async function StandaloneChatPage(): Promise<JSX.Element> {
  const user = await requireUser();
  const conversation = await privateChat(user.id);
  const [messages, stoppedReplyId, choices] = await Promise.all([
    listMessages(user.id, conversation.id),
    readStoppedReply(user.id, conversation.id),
    questCreationChoices(user.id),
  ]);
  return (
    <ChatScreen
      conversation={conversation}
      messages={messages}
      stoppedReplyId={stoppedReplyId}
      viewer={user.id}
      title={STANDALONE_CHAT_COPY.heading}
      actions={
        <QuestFromChat choices={choices} summary={chatSummaryDraft(messages)} />
      }
    />
  );
}
