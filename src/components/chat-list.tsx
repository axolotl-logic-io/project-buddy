import Link from "next/link";
import type { Chat } from "@/chats/store.ts";
import { getPersona } from "@/personas/index.ts";

const startedAt = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function ChatList({ chats }: { chats: Chat[] }) {
  if (chats.length === 0) {
    return <p className="text-zinc-600 dark:text-zinc-400">No chats yet.</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {chats.map((chat) => (
        <li key={chat.id}>
          <Link
            className="underline underline-offset-2"
            href={`/chats/${chat.id}`}
          >
            {getPersona(chat.personaId)?.name ?? chat.personaId}
          </Link>{" "}
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            started {startedAt.format(chat.createdAt)}
          </span>
        </li>
      ))}
    </ul>
  );
}
