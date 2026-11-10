import Link from "next/link";
import type { JSX } from "react";
import { RenameChatForm } from "@/app/(workspace)/chats/[chatId]/rename-chat-form.tsx";
import type { Chat } from "@/chats/chat-rows.ts";
import { type ChatMessage, otherAuthorNames } from "@/chats/message-author.ts";
import type { CommandListing } from "@/components/chat/chat-commands.ts";
import { ChatView } from "@/components/chat-view.tsx";
import { AdventureCharacterHeader } from "@/components/constructs/adventure-character-header.tsx";
import type { PlanActions } from "@/components/plan/use-plan.ts";
import { extraTag } from "@/flags/flags.ts";
import type { UserId } from "@/ids.ts";
import type { PlanState } from "@/plan/plan.ts";
import { MEMORY_COPY } from "@/ui/copy/memory.ts";
import { PROGRESS_TIMELINE_COPY } from "@/ui/copy/milestones.ts";
import { PROJECT_NOTES_COPY } from "@/ui/copy/notes.ts";
import { PLAN_COPY } from "@/ui/copy/plan.ts";
import { WORKSPACES_COPY } from "@/ui/copy/workspaces.ts";

// A chat with its editable title, conversation and composer, as viewer sees
// it: their own messages are theirs, and every other user message shows its
// author's name. stoppedReplyId is the last message's id when its reply
// stopped (readStoppedReply). A chat in a project shows plan, its project's
// plan, beside the conversation, and planActions change it and run the
// composer's commands; mockCommands are the mock model's commands
// for the composer's list, if it runs.
function ChatScreen({
  chat,
  messages,
  stoppedReplyId,
  viewer,
  plan,
  planActions,
  mockCommands,
}: {
  readonly chat: Chat;
  readonly messages: ChatMessage[];
  readonly stoppedReplyId: string | undefined;
  readonly viewer: UserId;
  readonly plan?: PlanState | undefined;
  readonly planActions?: PlanActions | undefined;
  readonly mockCommands?: readonly CommandListing[] | undefined;
}): JSX.Element {
  const constructName = chat.construct.name;
  return (
    <>
      <header className="chat-header" {...extraTag("pinned-chat-header")}>
        <div className="flex min-w-0 items-center gap-3">
          <AdventureCharacterHeader
            construct={chat.construct}
            destination={{ kind: "adventure", id: chat.id }}
            compact={true}
          />
          <div className="min-w-0 flex-1">
            <RenameChatForm
              chatId={chat.id}
              name={chat.name}
              constructName={constructName}
            />
          </div>
        </div>
      </header>
      <nav
        className="adventure-workspace-nav"
        aria-label={WORKSPACES_COPY.conversation}
      >
        <div className="workspace-tablist">
          <Link
            className="workspace-tab"
            aria-current="page"
            href={`/chats/${chat.id}`}
          >
            {WORKSPACES_COPY.conversation}
          </Link>
          {chat.project !== undefined && (
            <>
              <Link
                className="workspace-tab"
                href={`/projects/${chat.project.id}/memory`}
              >
                {MEMORY_COPY.link}
              </Link>
              <Link
                className="workspace-tab"
                href={`/projects/${chat.project.id}?section=plan`}
              >
                {PLAN_COPY.heading}
              </Link>
              <Link
                className="workspace-tab"
                href={`/projects/${chat.project.id}?section=notes`}
              >
                {PROJECT_NOTES_COPY.heading}
              </Link>
              <Link
                className="workspace-tab"
                href={`/projects/${chat.project.id}?section=progress`}
              >
                {PROGRESS_TIMELINE_COPY.heading}
              </Link>
            </>
          )}
        </div>
      </nav>
      <ChatView
        viewer={viewer}
        chatId={chat.id}
        key={chat.id}
        initialMessages={messages}
        stoppedReplyId={stoppedReplyId}
        constructName={constructName}
        construct={chat.construct}
        authorNames={otherAuthorNames(messages, viewer)}
        projectId={chat.project?.id}
        initialPlan={plan}
        planActions={planActions}
        mockCommands={mockCommands}
      />
    </>
  );
}

export { ChatScreen };
