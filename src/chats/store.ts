import type { UIMessage } from "ai";
import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { chats, messages, projects } from "@/db/schema";
import type { PersonaId } from "@/personas";

export type Chat = typeof chats.$inferSelect;
export type ChatWithProject = Chat & { projectName: string };

export async function listChats(projectId: string): Promise<Chat[]> {
  return getDb()
    .select()
    .from(chats)
    .where(eq(chats.projectId, projectId))
    .orderBy(desc(chats.createdAt));
}

export async function getChat(
  id: string,
): Promise<ChatWithProject | undefined> {
  const [chat] = await getDb()
    .select({
      id: chats.id,
      projectId: chats.projectId,
      personaId: chats.personaId,
      createdAt: chats.createdAt,
      projectName: projects.name,
    })
    .from(chats)
    .innerJoin(projects, eq(chats.projectId, projects.id))
    .where(eq(chats.id, id));
  return chat;
}

export async function createChat(chat: {
  projectId: string;
  personaId: PersonaId;
}): Promise<Chat> {
  const [created] = await getDb().insert(chats).values(chat).returning();
  return created;
}

export async function listMessages(chatId: string): Promise<UIMessage[]> {
  return getDb()
    .select({ id: messages.id, role: messages.role, parts: messages.parts })
    .from(messages)
    .where(eq(messages.chatId, chatId))
    .orderBy(asc(messages.createdAt), asc(messages.id));
}

export async function saveMessage(
  chatId: string,
  message: UIMessage,
): Promise<void> {
  await getDb().insert(messages).values({
    id: message.id,
    chatId,
    role: message.role,
    parts: message.parts,
  });
}
