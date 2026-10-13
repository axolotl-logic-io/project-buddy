// Starting a chat, in a project or in a new project: the tutor's opening
// (chat-opening.ts) is written first, then the chat is saved with it as its
// first message, so the user finds the tutor already speaking. It takes as
// long as Claude takes to write the opening, up to the opening's timeout.
// When Claude can't write it, nothing is saved: no chat, and no new project.
// Once the owner's monthly quota is used up (src/quota/quota.ts), nothing is
// asked of Claude and nothing is saved. The rows are saved together, in one
// transaction, so a failure leaves no chat without its opening and no
// project without its chat.
import type { Chat } from "@/chats/chat-rows.ts";
import {
  createChatWithOpening,
  createProjectWithChat,
} from "@/chats/new-chat-store.ts";
import type { UserId } from "@/ids.ts";
import { EMPTY_MEMORY } from "@/memory/memory.ts";
import { readMemory } from "@/memory/memory-store.ts";
import {
  DEFAULT_PERSONA_ID,
  getPersona,
  type Persona,
} from "@/personas/index.ts";
import type { Project } from "@/projects/store.ts";
import { checkQuota } from "@/quota/quota.ts";
import { writeChatOpening } from "@/tutor/chat-opening.ts";

// The chat, saved with its opening, or why nothing was saved: Claude is
// unavailable, or the owner's quota is used up until resetsOn.
type StartChatResult =
  | { readonly kind: "started"; readonly chat: Chat }
  | { readonly kind: "claudeUnavailable" }
  | { readonly kind: "quotaUsedUp"; readonly resetsOn: Date };

const CLAUDE_UNAVAILABLE: StartChatResult = { kind: "claudeUnavailable" };

// A new chat in the owner's project, in the persona, which the chat keeps as
// it is now. It is a lesson, not the project's interview chat. A storage failure throws, and so does a project of another
// user's, as not found.
async function startChat(
  owner: UserId,
  project: Project,
  persona: Persona,
): Promise<StartChatResult> {
  const quota = await checkQuota(owner);
  if (quota.kind === "usedUp") {
    return { kind: "quotaUsedUp", resetsOn: quota.resetsOn };
  }
  const memory = await readMemory(owner, project.id);
  const opening = await writeChatOpening({
    grant: quota.grant,
    projectName: project.name,
    isInterviewChat: false,
    memory,
    persona,
  });
  if (opening === undefined) {
    return CLAUDE_UNAVAILABLE;
  }
  const chat = await createChatWithOpening(
    owner,
    { projectId: project.id, persona },
    opening,
  );
  return { kind: "started", chat };
}

// A new project of the owner's named name, with its first chat in the
// default persona, whose opening starts the project's interview: the chat
// is saved as the project's interview chat. A storage failure throws.
async function startProject(
  owner: UserId,
  name: string,
): Promise<StartChatResult> {
  const quota = await checkQuota(owner);
  if (quota.kind === "usedUp") {
    return { kind: "quotaUsedUp", resetsOn: quota.resetsOn };
  }
  const persona = getPersona(DEFAULT_PERSONA_ID);
  const opening = await writeChatOpening({
    grant: quota.grant,
    projectName: name,
    isInterviewChat: true,
    memory: EMPTY_MEMORY,
    persona,
  });
  if (opening === undefined) {
    return CLAUDE_UNAVAILABLE;
  }
  const chat = await createProjectWithChat(owner, name, {
    persona,
    opening,
  });
  return { kind: "started", chat };
}

export type { StartChatResult };
export { startChat, startProject };
