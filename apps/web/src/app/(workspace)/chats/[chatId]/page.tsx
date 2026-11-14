import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/auth/current-user.ts";
import { resolveConversation } from "@/conversations/resolve.ts";

// Opens the accessible quest that owns the conversation.
export default async function OldChatPage({
  params,
}: PageProps<"/chats/[chatId]">): Promise<never> {
  const { chatId } = await params;
  const user = await requireUser();
  const place = await resolveConversation(user.id, chatId);
  if (place === undefined) {
    notFound();
  }
  redirect(`/quests/${place.questId}`);
}
