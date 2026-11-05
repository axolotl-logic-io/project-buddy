// Standalone chats, which are in no project and belong to their user
// directly. Each keeps its own construct snapshot, as a project chat does.
import { and, desc, eq, isNull } from "drizzle-orm";
import { chatOpenTo } from "@/accounts/owner-scope.ts";
import {
  type Chat,
  type ChatRow,
  chatColumnsFor,
  toChats,
} from "@/chats/chat-rows.ts";
import type { NewChatConstruct } from "@/chats/new-chat-store.ts";
import { storedConstructPrompt } from "@/constructs/construct-definition.ts";
import { DEFAULT_CONSTRUCT_ID, getConstruct } from "@/constructs/index.ts";
import { getDb } from "@/db/client.ts";
import { chats } from "@/db/tables/projects-and-chats.ts";
import { AppError } from "@/errors/app-error.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import type { UserId } from "@/ids.ts";

// Standalone chats' rows, each with whether it is unread for the user
// reading it, as chats: they have no project's columns.
function standaloneChats(
  rows: readonly (ChatRow & { readonly unread: boolean })[],
): Chat[] {
  return toChats(rows.map((row) => ({ ...row, projectName: null })));
}

// A new, empty standalone chat with the construct as it is now. The caller
// checks the owner's gold before starting a chat; no model is called for an opening.
function createStandaloneChat(
  owner: UserId,
  construct: NewChatConstruct = getConstruct(DEFAULT_CONSTRUCT_ID),
): Promise<Chat> {
  return withAppErrors("createStandaloneChat", async () => {
    const [chat] = standaloneChats(
      await getDb()
        .insert(chats)
        .values({
          userId: owner,
          constructId: construct.id,
          constructName: construct.name,
          constructParts: storedConstructPrompt(construct.definition),
        })
        .returning()
        // A new chat is unread for no one.
        .then((rows) => rows.map((row) => ({ ...row, unread: false }))),
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
        .select(chatColumnsFor(owner))
        .from(chats)
        .where(
          and(
            eq(chats.userId, owner),
            isNull(chats.projectId),
            chatOpenTo(owner),
          ),
        )
        .orderBy(desc(chats.createdAt), desc(chats.id)),
    ),
  );
}

export { createStandaloneChat, listStandaloneChats };
