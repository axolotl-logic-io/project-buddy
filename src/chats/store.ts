import type { UIMessage } from "ai";
import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client.ts";
import { chats, messages, projects } from "@/db/tables/projects-and-chats.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import type { PersonaId } from "@/personas/index.ts";

export type Chat = typeof chats.$inferSelect;
export type ChatWithProject = Chat & { projectName: string };

export function listChats(projectId: string): Promise<Chat[]> {
  return withAppErrors("listChats", () =>
    getDb()
      .select()
      .from(chats)
      .where(eq(chats.projectId, projectId))
      .orderBy(desc(chats.createdAt)),
  );
}

export async function getChat(
  id: string,
): Promise<ChatWithProject | undefined> {
  const [chat] = await withAppErrors("getChat", () =>
    getDb()
      .select({
        id: chats.id,
        projectId: chats.projectId,
        personaId: chats.personaId,
        createdAt: chats.createdAt,
        projectName: projects.name,
      })
      .from(chats)
      .innerJoin(projects, eq(chats.projectId, projects.id))
      .where(eq(chats.id, id)),
  );
  return chat;
}

export function createChat(chat: {
  projectId: string;
  personaId: PersonaId;
}): Promise<Chat> {
  return withAppErrors("createChat", async () => {
    const [created] = await getDb().insert(chats).values(chat).returning();
    if (created === undefined) {
      throw new Error("Inserting a chat returned no row");
    }
    return created;
  });
}

export function listMessages(chatId: string): Promise<UIMessage[]> {
  return withAppErrors("listMessages", () =>
    getDb()
      .select({ id: messages.id, role: messages.role, parts: messages.parts })
      .from(messages)
      .where(eq(messages.chatId, chatId))
      .orderBy(asc(messages.createdAt), asc(messages.id)),
  );
}

export async function saveMessage(
  chatId: string,
  message: UIMessage,
): Promise<void> {
  await withAppErrors("saveMessage", () =>
    getDb().insert(messages).values({
      id: message.id,
      chatId,
      role: message.role,
      parts: message.parts,
    }),
  );
}
