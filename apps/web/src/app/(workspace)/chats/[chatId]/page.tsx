import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/auth/current-user.ts";
import { resolveConversation } from "@/conversations/resolve.ts";
import { STANDALONE_CHAT_PATH } from "@/routes.ts";

// An old adventure's address, from a link, a bookmark or an email, opens
// where its conversation lives now: the quest it belongs to, when the user
// can open that quest, or her own Chat. Any other id, malformed, removed or
// someone else's, is not found, so the address reveals nothing.
export default async function OldChatPage({
  params,
}: PageProps<"/chats/[chatId]">): Promise<never> {
  const { chatId } = await params;
  const user = await requireUser();
  const place = await resolveConversation(user.id, chatId);
  if (place === undefined) {
    notFound();
  }
  if (place.kind === "chat") {
    redirect(STANDALONE_CHAT_PATH);
  }
  redirect(`/projects/${place.projectId}`);
}
