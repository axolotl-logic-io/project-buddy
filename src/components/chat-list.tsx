import Link from "next/link";
import type { JSX, ReactNode } from "react";
import type { Chat } from "@/chats/chat-rows.ts";
import { extraTag } from "@/flags/flags.ts";
import { getPersona } from "@/personas/index.ts";
import { CHAT_NAME_COPY } from "@/ui/copy/chat.ts";
import { PROJECT_COPY } from "@/ui/copy/projects.ts";

const startedAt = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

// A chat's link text: its name and persona, or before it has a name, its
// persona alone. The name's part is the chat-names extra, so a user who hides
// it sees every chat as an unnamed one.
function ChatTitle({ chat }: { readonly chat: Chat }): ReactNode {
  const personaName = getPersona(chat.personaId).name;
  if (chat.name === undefined) {
    return personaName;
  }
  return (
    <>
      <span {...extraTag("chat-names")}>
        {CHAT_NAME_COPY.listNamePrefix(chat.name)}
      </span>{" "}
      {personaName}
    </>
  );
}

// The project's chats as cards, each a link to its chat named by its title
// alone, then when it started; the whole card is the link's target.
export function ChatList({ chats }: { chats: Chat[] }): JSX.Element {
  if (chats.length === 0) {
    return <p className="text-muted">{PROJECT_COPY.noChats}</p>;
  }
  return (
    <ul className="flex flex-col gap-3">
      {chats.map((chat) => (
        <li className="link-card flex flex-col gap-0.5" key={chat.id}>
          <Link className="font-semibold" href={`/chats/${chat.id}`}>
            <ChatTitle chat={chat} />
          </Link>{" "}
          <span className="text-muted text-sm">
            {PROJECT_COPY.chatStarted(startedAt.format(chat.createdAt))}
          </span>
        </li>
      ))}
    </ul>
  );
}
