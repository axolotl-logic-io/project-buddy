// Project-free chats use the same conversation, tools and ownership rules
// as the original central chat. Each new chat keeps its own buddy snapshot.
// The chats page (/chat) lists them beside the owner's project chats
// (listAllChats).
import { and, desc, eq } from "drizzle-orm";
import { chatOwnedBy } from "@/accounts/owner-scope.ts";
import { DEFAULT_BUDDY_ID, getBuddy } from "@/buddies/index.ts";
import type { FoundChat } from "@/chats/chat-rows.ts";
import { type CentralChat, type ChatRow, toChats } from "@/chats/chat-rows.ts";
import type { NewChatBuddy } from "@/chats/new-chat-store.ts";
import { getDb } from "@/db/client.ts";
import { chats } from "@/db/tables/projects-and-chats.ts";
import { AppError } from "@/errors/app-error.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import type { ProjectId, UserId } from "@/ids.ts";

function centralChats(rows: readonly ChatRow[]): CentralChat[] {
  return toChats(rows).flatMap(({ place, ...chat }) => {
    if (place.kind !== "central") {
      return [];
    }
    return [{ ...chat, kind: "central" }];
  });
}

// A new, empty standalone chat with the buddy as it is now. The caller
// checks quota before starting a chat; no model is called for an opening.
function createCentralChat(
  owner: UserId,
  buddy: NewChatBuddy = getBuddy(DEFAULT_BUDDY_ID),
): Promise<CentralChat> {
  return withAppErrors("createCentralChat", async () => {
    const [chat] = centralChats(
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

// The owner's standalone chats, newest first, including their original
// central chat. Reading the list never creates a conversation.
function listCentralChats(owner: UserId): Promise<CentralChat[]> {
  return withAppErrors("listCentralChats", async () =>
    centralChats(
      await getDb()
        .select()
        .from(chats)
        .where(and(eq(chats.userId, owner), chatOwnedBy(owner)))
        .orderBy(desc(chats.createdAt), desc(chats.id)),
    ),
  );
}

// The owner's chats, project chats and central chats together, newest first
// as listCentralChats orders them, each as getChat (src/chats/store.ts) finds
// it: a project chat with its project's name. With a project id, only that
// project's chats, and none if the project is another user's.
function listAllChats(
  owner: UserId,
  projectId?: ProjectId,
): Promise<FoundChat[]> {
  // Stub for issue #472: the implementer writes the query.
  return Promise.reject(
    new Error(`listAllChats(${owner}, ${projectId}) is not implemented`),
  );
}

export { createCentralChat, listAllChats, listCentralChats };
