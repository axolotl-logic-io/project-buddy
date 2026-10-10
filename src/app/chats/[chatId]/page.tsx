import Link from "next/link";
import { notFound } from "next/navigation";
import { type JSX, Suspense } from "react";
import { getChat, listMessages } from "@/chats/store.ts";
import { ChatView } from "@/components/chat-view.tsx";
import { getPersona } from "@/personas/index.ts";
import { COPY } from "@/ui/copy.ts";

async function Chat({ chatId }: { chatId: string }): Promise<JSX.Element> {
  const [chat, messages] = await Promise.all([
    getChat(chatId),
    listMessages(chatId),
  ]);
  if (chat === undefined) {
    notFound();
  }
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
        {COPY.chat.heading(personaName)}
      </h1>
      <ChatView
        chatId={chat.id}
        initialMessages={messages}
        personaName={personaName}
      />
    </>
  );
}

export default function ChatPage({
  params,
}: PageProps<"/chats/[chatId]">): JSX.Element {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-10">
      <Suspense fallback={<p>{COPY.chat.loading}</p>}>
        {params.then(
          ({ chatId }): JSX.Element => (
            <Chat chatId={chatId} />
          ),
        )}
      </Suspense>
    </main>
  );
}
