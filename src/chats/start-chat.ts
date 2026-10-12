// Starting a chat, in a project or in a new project: the tutor's opening
// (chat-opening.ts) is written first, then the chat is saved with it as its
// first message, so the user finds the tutor already speaking. It takes as
// long as Claude takes to write the opening, up to the opening's timeout.
// When Claude can't write it, nothing is saved: no chat, and no new project.
import {
  type Chat,
  createChat,
  type NewMessage,
  saveMessage,
} from "@/chats/store.ts";
import type { ProjectId } from "@/ids.ts";
import { EMPTY_MEMORY } from "@/memory/memory.ts";
import { readMemory } from "@/memory/memory-store.ts";
import { DEFAULT_PERSONA_ID, type PersonaId } from "@/personas/index.ts";
import { createProject, type Project } from "@/projects/store.ts";
import { writeChatOpening } from "@/tutor/chat-opening.ts";

// The chat, saved with its opening, or that Claude is unavailable, so
// nothing was saved.
type StartChatResult =
  | { readonly kind: "started"; readonly chat: Chat }
  | { readonly kind: "claudeUnavailable" };

const CLAUDE_UNAVAILABLE: StartChatResult = { kind: "claudeUnavailable" };

async function saveChat(
  projectId: ProjectId,
  personaId: PersonaId,
  opening: NewMessage,
): Promise<StartChatResult> {
  const chat = await createChat({ projectId, personaId });
  await saveMessage(chat.id, opening);
  return { kind: "started", chat };
}

// A new chat in the project, in the persona. A storage failure throws.
async function startChat(
  project: Project,
  personaId: PersonaId,
): Promise<StartChatResult> {
  const memory = await readMemory(project.id);
  const opening = await writeChatOpening({
    projectName: project.name,
    memory,
    personaId,
  });
  if (opening === undefined) {
    return CLAUDE_UNAVAILABLE;
  }
  return saveChat(project.id, personaId, opening);
}

// A new project named name, with its first chat in the default persona,
// whose opening starts the project's interview. A storage failure throws.
async function startProject(name: string): Promise<StartChatResult> {
  const opening = await writeChatOpening({
    projectName: name,
    memory: EMPTY_MEMORY,
    personaId: DEFAULT_PERSONA_ID,
  });
  if (opening === undefined) {
    return CLAUDE_UNAVAILABLE;
  }
  const project = await createProject(name);
  return saveChat(project.id, DEFAULT_PERSONA_ID, opening);
}

export type { StartChatResult };
export { startChat, startProject };
