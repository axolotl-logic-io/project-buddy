import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getChat, listMessages } from "@/chats/store.ts";
import { ChatView } from "@/components/chat-view.tsx";
import { getPersona } from "@/personas/index.ts";

export default function ChatPage({ params }: PageProps<"/chats/[chatId]">) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-10">
      <Suspense fallback={<p>Loading chat…</p>}>
        {params.then(({ chatId }) => (
          <Chat chatId={chatId} />
        ))}
      </Suspense>
    </main>
  );
}

async function Chat({ chatId }: { chatId: string }) {
  const [chat, messages] = await Promise.all([
    getChat(chatId),
    listMessages(chatId),
  ]);
  if (!chat) notFound();
  const personaName = getPersona(chat.personaId)?.name ?? chat.personaId;

  return (
    <>
      <Link
        className="text-sm underline underline-offset-2"
        href={`/projects/${chat.projectId}`}
      >
        {chat.projectName}
      </Link>
      <h1 className="font-semibold text-3xl tracking-tight">
        Chat with {personaName}
      </h1>
      <ChatView
        chatId={chat.id}
        initialMessages={messages}
        personaName={personaName}
      />
    </>
  );
}
