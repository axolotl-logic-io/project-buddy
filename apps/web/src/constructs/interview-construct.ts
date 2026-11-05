// The account preference is resolved afresh for each new quest. A deleted
// or inaccessible construct falls back to Vellum; existing snapshots stay intact.
import { accountOwnedBy } from "@/accounts/owner-scope.ts";
import {
  type ChosenConstruct,
  chosenConstruct,
} from "@/constructs/chosen-construct.ts";
import { DEFAULT_CONSTRUCT_ID, getConstruct } from "@/constructs/index.ts";
import { getDb } from "@/db/client.ts";
import { users } from "@/db/tables/users.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import type { UserId } from "@/ids.ts";

async function interviewConstruct(owner: UserId): Promise<ChosenConstruct> {
  const [row] = await withAppErrors("read interview construct", () =>
    getDb()
      .select({ id: users.interviewConstructId })
      .from(users)
      .where(accountOwnedBy(owner)),
  );
  return (
    (await chosenConstruct(owner, row?.id ?? undefined)) ?? {
      id: DEFAULT_CONSTRUCT_ID,
      construct: getConstruct(DEFAULT_CONSTRUCT_ID),
    }
  );
}

async function saveInterviewConstruct(
  owner: UserId,
  id: string,
): Promise<boolean> {
  const chosen = await chosenConstruct(owner, id);
  if (chosen === undefined) {
    return false;
  }
  await withAppErrors("save interview construct", () =>
    getDb()
      .update(users)
      .set({ interviewConstructId: chosen.id })
      .where(accountOwnedBy(owner)),
  );
  return true;
}

export { interviewConstruct, saveInterviewConstruct };
