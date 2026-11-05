// The account preference is resolved afresh for each new quest. A deleted
// or inaccessible buddy falls back to Vellum; existing snapshots stay intact.
import { accountOwnedBy } from "@/accounts/owner-scope.ts";
import { type ChosenBuddy, chosenBuddy } from "@/buddies/chosen-buddy.ts";
import { DEFAULT_BUDDY_ID, getBuddy } from "@/buddies/index.ts";
import { getDb } from "@/db/client.ts";
import { users } from "@/db/tables/users.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import type { UserId } from "@/ids.ts";

async function interviewBuddy(owner: UserId): Promise<ChosenBuddy> {
  const [row] = await withAppErrors("read interview buddy", () =>
    getDb()
      .select({ id: users.interviewBuddyId })
      .from(users)
      .where(accountOwnedBy(owner)),
  );
  return (
    (await chosenBuddy(owner, row?.id ?? undefined)) ?? {
      id: DEFAULT_BUDDY_ID,
      buddy: getBuddy(DEFAULT_BUDDY_ID),
    }
  );
}

async function saveInterviewBuddy(owner: UserId, id: string): Promise<boolean> {
  const chosen = await chosenBuddy(owner, id);
  if (chosen === undefined) {
    return false;
  }
  await withAppErrors("save interview buddy", () =>
    getDb()
      .update(users)
      .set({ interviewBuddyId: chosen.id })
      .where(accountOwnedBy(owner)),
  );
  return true;
}

export { interviewBuddy, saveInterviewBuddy };
