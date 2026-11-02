import Link from "next/link";
import type { JSX, ReactNode } from "react";
import type { Chat } from "@/chats/chat-rows.ts";
import { CopyWithTime } from "@/components/copy-with-time.tsx";
import { TIME_SLOT } from "@/components/time-format.ts";
import { extraTag } from "@/flags/flags.ts";
import { CHAT_NAME_COPY } from "@/ui/copy/chat.ts";
import { UNREAD_COPY } from "@/ui/copy/check-ins.ts";
import { PROJECT_COPY } from "@/ui/copy/projects.ts";

// A chat's link text: its name and buddy, or before it has a name, its
// buddy alone. The name's part is the chat-names extra, so a user who hides
// it sees every chat as an unnamed one.
function ChatTitle({ chat }: { readonly chat: Chat }): ReactNode {
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
function ProjectBadge({ chat }: { readonly chat: Chat }): ReactNode {
  if (chat.project === undefined) {
    return null;
  }
  return (
    <span className="max-w-full self-start truncate rounded-control border border-line bg-field px-2 text-muted text-sm">
      {chat.project.name}
    </span>
  );
}

// The id of an unread chat's mark, which describes the chat's link, so
// moving from link to link still announces it; undefined for a read chat.
function unreadMarkId(chat: Chat): string | undefined {
  if (!chat.unread) {
    return undefined;
  }
  return `unread-${chat.id}`;
}

// An unread chat's mark, such as a new check-in's, outside the chat's link
// so the link's name stays the chat's title; the link names it as its
// description.
function UnreadMark({ chat }: { readonly chat: Chat }): ReactNode {
  const id = unreadMarkId(chat);
  if (id === undefined) {
    return null;
  }
  return (
    <span
      id={id}
      className="self-start rounded-control bg-accent px-2 font-semibold text-on-accent text-sm"
    >
      {UNREAD_COPY.mark}
    </span>
  );
}

// Chats as cards, each a link to its conversation named by its title
// alone, then when it started; the whole card is the link's target. An
// unread chat, such as a new check-in, is marked. With showProjectNames, a
// project chat also carries its project's name.
function ChatList({
  chats,
  emptyMessage = PROJECT_COPY.noChats,
  showProjectNames = false,
}: {
  chats: readonly Chat[];
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
          <Link
            aria-describedby={unreadMarkId(chat)}
            className="font-semibold"
            href={`/chats/${chat.id}`}
          >
            <ChatTitle chat={chat} />
          </Link>{" "}
          <UnreadMark chat={chat} />
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

export { ChatList };
