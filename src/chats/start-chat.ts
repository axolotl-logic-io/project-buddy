// Starting a chat, in a project or in a new project: the tutor's opening
// (chat-opening.ts) is written first, then the chat is saved with it as its
// first message, so the user finds the tutor already speaking. It takes as
// long as Claude takes to write the opening, up to the opening's timeout.
// When Claude can't write it, nothing is saved: no chat, and no new project.
// The rows are saved together, in one transaction, so a failure leaves no
// chat without its opening and no project without its chat.
import type { Chat } from "@/chats/chat-rows.ts";
import {
  createChatWithOpening,
  createProjectWithChat,
} from "@/chats/new-chat-store.ts";
import type { UserId } from "@/ids.ts";
import { EMPTY_MEMORY } from "@/memory/memory.ts";
import { readMemory } from "@/memory/memory-store.ts";
import { DEFAULT_PERSONA_ID, type PersonaId } from "@/personas/index.ts";
import type { Project } from "@/projects/store.ts";
import { writeChatOpening } from "@/tutor/chat-opening.ts";

// The chat, saved with its opening, or that Claude is unavailable, so
// nothing was saved.
type StartChatResult =
  | { readonly kind: "started"; readonly chat: Chat }
  | { readonly kind: "claudeUnavailable" };

const CLAUDE_UNAVAILABLE: StartChatResult = { kind: "claudeUnavailable" };

// A new chat in the owner's project, in the persona. A storage failure
// throws, and so does a project of another user's, as not found.
async function startChat(
  owner: UserId,
  project: Project,
  personaId: PersonaId,
): Promise<StartChatResult> {
  const memory = await readMemory(owner, project.id);
  const opening = await writeChatOpening({
    projectName: project.name,
    memory,
    personaId,
  });
  if (opening === undefined) {
    return CLAUDE_UNAVAILABLE;
  }
  const chat = await createChatWithOpening(
    owner,
    { projectId: project.id, personaId },
    opening,
  );
  return { kind: "started", chat };
}

// A new project of the owner's named name, with its first chat in the
// default persona, whose opening starts the project's interview. A storage
// failure throws.
async function startProject(
  owner: UserId,
  name: string,
): Promise<StartChatResult> {
  const opening = await writeChatOpening({
    projectName: name,
    memory: EMPTY_MEMORY,
    personaId: DEFAULT_PERSONA_ID,
  });
  if (opening === undefined) {
    return CLAUDE_UNAVAILABLE;
  }
  const chat = await createProjectWithChat(owner, name, {
    personaId: DEFAULT_PERSONA_ID,
    opening,
  });
  return { kind: "started", chat };
}

export type { StartChatResult };
export { startChat, startProject };
