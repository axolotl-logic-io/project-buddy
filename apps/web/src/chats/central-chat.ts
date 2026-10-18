// A user's central chat: the one chat of theirs that is in no project. It
// is made the first time it is asked for, with the default buddy, and is the
// same chat on every later call, however many run at once.
import { and, eq } from "drizzle-orm";
import { chatOwnedBy } from "@/accounts/owner-scope.ts";
import { DEFAULT_BUDDY_ID, getBuddy, snapshotOf } from "@/buddies/index.ts";
import { type CentralChat, toChats } from "@/chats/chat-rows.ts";
import { getDb } from "@/db/client.ts";
import { chats } from "@/db/tables/projects-and-chats.ts";
import { AppError } from "@/errors/app-error.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import type { UserId } from "@/ids.ts";

// The owner's central chat, made now, with the default buddy, no name and no
// messages, if the owner has none yet. Rejects with the not-found case only
// if the owner's account is deleted meanwhile.
export function getOrCreateCentralChat(owner: UserId): Promise<CentralChat> {
  return withAppErrors("getOrCreateCentralChat", async () => {
    const db = getDb();
    const buddy = snapshotOf(getBuddy(DEFAULT_BUDDY_ID));
    // A second insert that races the first waits for it to commit, then
    // does nothing, so concurrent calls read back the same chat.
    await db
      .insert(chats)
      .values({
        userId: owner,
        buddyId: DEFAULT_BUDDY_ID,
        buddyName: buddy.name,
        buddyParts: buddy.parts,
      })
      .onConflictDoNothing({ target: chats.userId });
    const rows = await db
      .select()
      .from(chats)
      .where(and(eq(chats.userId, owner), chatOwnedBy(owner)));
    for (const { place, ...chat } of toChats(rows)) {
      if (place.kind === "central") {
        return { ...chat, kind: "central" };
      }
    }
    throw new AppError("not-found", new Error("No such user to chat with"));
  });
}
