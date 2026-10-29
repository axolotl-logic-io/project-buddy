// Standalone chats, which are in no project and belong to their user
// directly. Each keeps its own buddy snapshot, as a project chat does.
import { and, desc, eq, isNull } from "drizzle-orm";
import { chatOwnedBy } from "@/accounts/owner-scope.ts";
import { DEFAULT_BUDDY_ID, getBuddy } from "@/buddies/index.ts";
import { type Chat, type ChatRow, toChats } from "@/chats/chat-rows.ts";
import type { NewChatBuddy } from "@/chats/new-chat-store.ts";
import { getDb } from "@/db/client.ts";
import { chats } from "@/db/tables/projects-and-chats.ts";
import { AppError } from "@/errors/app-error.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import type { UserId } from "@/ids.ts";

// Standalone chats' rows as chats: they have no project's columns.
function standaloneChats(rows: readonly ChatRow[]): Chat[] {
  return toChats(
    rows.map((row) => ({
      ...row,
      projectName: null,
      projectInterviewChatId: null,
    })),
  );
}

// A new, empty standalone chat with the buddy as it is now. The caller
// checks quota before starting a chat; no model is called for an opening.
function createStandaloneChat(
  owner: UserId,
  buddy: NewChatBuddy = getBuddy(DEFAULT_BUDDY_ID),
): Promise<Chat> {
  return withAppErrors("createStandaloneChat", async () => {
    const [chat] = standaloneChats(
      await getDb()
        .insert(chats)
        .values({
          userId: owner,
          buddyId: buddy.id,
          buddyName: buddy.name,
          buddyParts: buddy.parts,
        })
        .returning(),
    );
    if (chat === undefined) {
      throw new AppError("not-found", new Error("No such user to chat with"));
    }
    return chat;
  });
}

// The owner's standalone chats, newest first. Reading the list never
// creates a chat.
function listStandaloneChats(owner: UserId): Promise<Chat[]> {
  return withAppErrors("listStandaloneChats", async () =>
    standaloneChats(
      await getDb()
        .select()
        .from(chats)
        .where(
          and(
            eq(chats.userId, owner),
            isNull(chats.projectId),
            chatOwnedBy(owner),
          ),
        )
        .orderBy(desc(chats.createdAt), desc(chats.id)),
    ),
  );
}

export { createStandaloneChat, listStandaloneChats };
