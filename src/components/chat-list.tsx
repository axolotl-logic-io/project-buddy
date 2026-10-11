import Link from "next/link";
import type { JSX } from "react";
import type { Chat } from "@/chats/store.ts";
import { getPersona } from "@/personas/index.ts";
import { COPY } from "@/ui/copy.ts";

const startedAt = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

// A chat's link text: its name and persona, or before it has a name, its
// persona alone.
function chatTitle(chat: Chat): string {
  const personaName = getPersona(chat.personaId).name;
  if (chat.name === undefined) {
    return personaName;
  }
  return COPY.chatName.listTitle(chat.name, personaName);
}

export function ChatList({ chats }: { chats: Chat[] }): JSX.Element {
  if (chats.length === 0) {
    return <p className="text-muted">{COPY.project.noChats}</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {chats.map((chat) => (
        <li key={chat.id}>
          <Link className="text-link" href={`/chats/${chat.id}`}>
            {chatTitle(chat)}
          </Link>{" "}
          <span className="text-muted text-sm">
            {COPY.project.chatStarted(startedAt.format(chat.createdAt))}
          </span>
        </li>
      ))}
    </ul>
  );
}
