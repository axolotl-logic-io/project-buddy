import Link from "next/link";
import type { JSX, ReactNode } from "react";
import type { CentralChat, Chat, FoundChat } from "@/chats/chat-rows.ts";
import { CopyWithTime } from "@/components/copy-with-time.tsx";
import { TIME_SLOT } from "@/components/time-format.ts";
import { extraTag } from "@/flags/flags.ts";
import { CHAT_NAME_COPY } from "@/ui/copy/chat.ts";
import { PROJECT_COPY } from "@/ui/copy/projects.ts";

// A chat's link text: its name and buddy, or before it has a name, its
// buddy alone. The name's part is the chat-names extra, so a user who hides
// it sees every chat as an unnamed one.
function ChatTitle({ chat }: { readonly chat: Chat | CentralChat }): ReactNode {
  const buddyName = chat.buddy.name;
  if (chat.name === undefined) {
    return buddyName;
  }
  return (
    <>
      <span {...extraTag("chat-names")}>
        {CHAT_NAME_COPY.listNamePrefix(chat.name)}
      </span>{" "}
      {buddyName}
    </>
  );
}

// A project chat's badge, with its project's name, outside the chat's link so
// the link's name stays the chat's title. A long name is cut short.
function ProjectBadge({
  chat,
}: {
  readonly chat: Chat | FoundChat;
}): ReactNode {
  if (!("kind" in chat) || chat.kind !== "project") {
    return null;
  }
  return (
    <span className="max-w-full self-start truncate rounded-control border border-line bg-field px-2 text-muted text-sm">
      {chat.projectName}
    </span>
  );
}

// Chats as cards, each a link to its conversation named by its title
// alone, then when it started; the whole card is the link's target. With
// showProjectNames, a project chat also carries its project's name.
export function ChatList({
  chats,
  emptyMessage = PROJECT_COPY.noChats,
  showProjectNames,
}: {
  chats: readonly (Chat | FoundChat)[];
  emptyMessage?: string;
  showProjectNames?: boolean;
}): JSX.Element {
  if (chats.length === 0) {
    return <p className="text-muted">{emptyMessage}</p>;
  }
  return (
    <ul className="flex flex-col gap-3">
      {chats.map((chat) => (
        <li className="link-card flex flex-col gap-0.5" key={chat.id}>
          <Link className="font-semibold" href={`/chats/${chat.id}`}>
            <ChatTitle chat={chat} />
          </Link>{" "}
          {showProjectNames === true && <ProjectBadge chat={chat} />}
          <span className="text-muted text-sm">
            <CopyWithTime
              text={PROJECT_COPY.chatStarted(TIME_SLOT)}
              dateTime={chat.createdAt}
              detail="minute"
            />
          </span>
        </li>
      ))}
    </ul>
  );
}
