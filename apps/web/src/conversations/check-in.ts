// A check-in: the construct's short message about where the user left off,
// appended to the quest's conversation on the schedule the owner picks
// (src/check-ins/check-ins.ts). It keeps the conversation's construct and
// current activity, and marks the conversation unread for the owner and
// every member until each opens it. A quest with no conversation yet gets
// one, opened by the check-in.
import {
  type ChatProject,
  isProjectChat,
  type NewMessage,
  type ProjectChat,
} from "@/chats/chat-rows.ts";
import { chatAwaitsReply, markChatUnreadFor } from "@/chats/store.ts";
import { CHECK_IN_KICKOFF } from "@/check-ins/check-in-kickoff.ts";
import {
  appendConstructMessage,
  findConversation,
  findOrCreateConversation,
} from "@/conversations/conversation-store.ts";
import { defaultStart, openingFor } from "@/conversations/start-quest.ts";
import type { UserId } from "@/ids.ts";
import { listProjectMembers } from "@/projects/members-store.ts";
import { checkGold } from "@/quota/quota.ts";
import { readPromptProject } from "@/replies/system-prompt.ts";

// The check-in appended, whose text is message, or why it wasn't: the owner
// is out of batteries, Claude couldn't write it, or the conversation's newest
// message still awaits a reply, which only that reply may follow.
type CheckInResult =
  | {
      readonly kind: "started";
      readonly chat: ProjectChat;
      readonly message: NewMessage;
    }
  | { readonly kind: "outOfGold" }
  | { readonly kind: "claudeUnavailable" }
  | { readonly kind: "awaitingReply" };

// A check-in on the owner's quest, written from its Journal, Plan and
// Progress, and charged to the owner. A storage failure throws, and so does
// a quest of another user's, as not found.
async function appendCheckIn(
  owner: UserId,
  project: ChatProject,
): Promise<CheckInResult> {
  const gold = await checkGold(owner);
  if (gold.kind === "outOfGold") {
    return { kind: "outOfGold" };
  }
  const existing = await findConversation(owner, project.id);
  if (existing !== undefined && (await chatAwaitsReply(owner, existing.id))) {
    return { kind: "awaitingReply" };
  }
  const start = existing ?? defaultStart();
  const message = await openingFor(
    owner,
    gold.grant,
    () => readPromptProject(owner, project),
    { ...start, kickoff: CHECK_IN_KICKOFF },
  );
  if (message === undefined) {
    return { kind: "claudeUnavailable" };
  }
  const found = await findOrCreateConversation(owner, project, defaultStart());
  if (found === undefined) {
    throw new Error("A check-in's quest is not open to its owner");
  }
  const { conversation } = found;
  if (!(await appendConstructMessage(owner, conversation.id, message))) {
    return { kind: "awaitingReply" };
  }
  const people = await listProjectMembers(owner, project.id);
  await markChatUnreadFor(conversation.id, [
    owner,
    ...people.map(({ id }) => id),
  ]);
  if (!isProjectChat(conversation)) {
    throw new Error("A check-in's conversation has no quest");
  }
  return {
    kind: "started",
    chat: { ...conversation, unread: true },
    message,
  };
}

export type { CheckInResult };
export { appendCheckIn };
