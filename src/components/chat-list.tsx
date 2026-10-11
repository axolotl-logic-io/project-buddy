import Link from "next/link";
import type { JSX } from "react";
import type { Chat } from "@/chats/store.ts";
import { getPersona } from "@/personas/index.ts";
import { COPY } from "@/ui/copy.ts";

const startedAt = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

// A chat's link text and the detail after it: its name, then its persona and
// start time, or before it has a name, its persona, then its start time.
function chatLabel(chat: Chat): { title: string; detail: string } {
  const personaName = getPersona(chat.personaId)?.name ?? chat.personaId;
  const started = startedAt.format(chat.createdAt);
  if (chat.name === undefined) {
    return { title: personaName, detail: COPY.project.chatStarted(started) };
  }
  return {
    title: chat.name,
    detail: COPY.chatName.listDetail(personaName, started),
  };
}

export function ChatList({ chats }: { chats: Chat[] }): JSX.Element {
  if (chats.length === 0) {
    return <p className="text-muted">{COPY.project.noChats}</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {chats.map((chat) => {
        const { title, detail } = chatLabel(chat);
        return (
          <li key={chat.id}>
            <Link className="text-link" href={`/chats/${chat.id}`}>
              {title}
            </Link>{" "}
            <span className="text-muted text-sm">{detail}</span>
          </li>
        );
      })}
    </ul>
  );
}
