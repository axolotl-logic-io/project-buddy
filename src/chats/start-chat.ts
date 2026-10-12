// Starting a chat: a new chat in a project, in a persona, saved with the
// tutor's opening (chat-opening.ts) as its first message, so the user finds
// the tutor already speaking. It takes as long as Claude takes to write the
// opening, up to the opening's timeout, and never fails because of Claude.
import { type Chat, createChat, saveMessage } from "@/chats/store.ts";
import type { PersonaId } from "@/personas/index.ts";
import type { Project } from "@/projects/store.ts";
import { writeChatOpening } from "@/tutor/chat-opening.ts";

// The new chat, with its opening saved. A storage failure throws.
async function startChat(
  project: Project,
  personaId: PersonaId,
): Promise<Chat> {
  const chat = await createChat({ projectId: project.id, personaId });
  const opening = await writeChatOpening({
    ...chat,
    projectName: project.name,
  });
  await saveMessage(chat.id, opening);
  return chat;
}

export { startChat };
