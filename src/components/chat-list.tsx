import Link from "next/link";
import type { JSX } from "react";
import type { Chat } from "@/chats/store.ts";
import { getPersona } from "@/personas/index.ts";
import { COPY } from "@/ui/copy.ts";

const startedAt = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function ChatList({ chats }: { chats: Chat[] }): JSX.Element {
  if (chats.length === 0) {
    return <p className="text-muted">{COPY.project.noChats}</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {chats.map((chat) => (
        <li key={chat.id}>
          <Link className="text-link" href={`/chats/${chat.id}`}>
            {getPersona(chat.personaId)?.name ?? chat.personaId}
          </Link>
          <span className="text-muted text-sm">
            {COPY.project.chatStarted(startedAt.format(chat.createdAt))}
          </span>
        </li>
      ))}
    </ul>
  );
}
