import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { z } from "zod";
import { riteOwnedBy } from "@/accounts/owner-scope.ts";
import { getDb } from "@/db/client.ts";
import { rites } from "@/db/tables/performances.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import type { UserId } from "@/ids.ts";
import {
  BUILT_IN_RITES,
  RITE_DEFINITION,
  type Rite,
  type RiteDefinition,
} from "./rite.ts";

const OWN_RITE_ID = z.guid().toLowerCase().brand<"OwnRiteId">();
type OwnRiteId = z.infer<typeof OWN_RITE_ID>;

function asRite(row: typeof rites.$inferSelect): Rite {
  const rite: Rite = {
    ...RITE_DEFINITION.parse(row),
    id: row.id,
    source: "own",
    updatedAt: row.updatedAt,
  };
  if (row.forgottenAt === null) {
    return rite;
  }
  return { ...rite, forgottenAt: row.forgottenAt };
}

// The user's active rites, built-in ones first and then their own by name;
// or, with forgotten, only their own forgotten rites, the most recently
// forgotten first.
function listRites(user: UserId, forgotten = false): Promise<Rite[]> {
  return withAppErrors("listRites", async () => {
    if (forgotten) {
      const rows = await getDb()
        .select()
        .from(rites)
        .where(and(riteOwnedBy(user), isNotNull(rites.forgottenAt)))
        .orderBy(desc(rites.forgottenAt), rites.name, rites.id);
      return rows.map(asRite);
    }
    const rows = await getDb()
      .select()
      .from(rites)
      .where(and(riteOwnedBy(user), isNull(rites.forgottenAt)))
      .orderBy(rites.name, rites.id);
    return [...BUILT_IN_RITES, ...rows.map(asRite)];
  });
}

function readRite(
  user: UserId,
  id: string,
  includeForgotten = false,
): Promise<Rite | undefined> {
  const builtIn = BUILT_IN_RITES.find((rite) => rite.id === id);
  if (builtIn !== undefined) {
    return Promise.resolve(builtIn);
  }
  if (!OWN_RITE_ID.safeParse(id).success) {
    return Promise.resolve(undefined);
  }
  return withAppErrors("readRite", async () => {
    const [row] = await getDb()
      .select()
      .from(rites)
      .where(and(eq(rites.id, id), riteOwnedBy(user)));
    if (row === undefined || (row.forgottenAt !== null && !includeForgotten)) {
      return;
    }
    return asRite(row);
  });
}

function saveRite(
  user: UserId,
  definition: RiteDefinition,
  id?: OwnRiteId,
): Promise<Rite | undefined> {
  return withAppErrors("saveRite", async () => {
    if (id === undefined) {
      const [created] = await getDb()
        .insert(rites)
        .values({ ...definition, userId: user })
        .returning();
      if (created === undefined) {
        throw new Error("Inserting a rite returned no rite");
      }
      return asRite(created);
    }
    const [saved] = await getDb()
      .update(rites)
      .set({ ...definition, updatedAt: new Date() })
      .where(
        and(eq(rites.id, id), riteOwnedBy(user), isNull(rites.forgottenAt)),
      )
      .returning();
    if (saved === undefined) {
      return;
    }
    return asRite(saved);
  });
}

// Forgets the user's active own rite, restores their forgotten one, or
// deletes their forgotten one forever, and says whether it did. Each is one
// statement that checks the rite's state as it changes it, so an active
// rite is never deleted, however recently it was restored. A foreign or
// unknown id, or a change already made, changes nothing. Performances keep
// their rite snapshots.
function changeRiteAvailability(
  user: UserId,
  id: OwnRiteId,
  change: "forget" | "restore" | "delete",
): Promise<boolean> {
  return withAppErrors("changeRiteAvailability", async () => {
    const owned = and(eq(rites.id, id), riteOwnedBy(user));
    if (change === "delete") {
      const removed = await getDb()
        .delete(rites)
        .where(and(owned, isNotNull(rites.forgottenAt)))
        .returning({ id: rites.id });
      return removed.length > 0;
    }
    let forgottenAt: Date | null = null;
    let prior = isNotNull(rites.forgottenAt);
    if (change === "forget") {
      forgottenAt = new Date();
      prior = isNull(rites.forgottenAt);
    }
    const updated = await getDb()
      .update(rites)
      .set({ forgottenAt })
      .where(and(owned, prior))
      .returning({ id: rites.id });
    return updated.length > 0;
  });
}

export { changeRiteAvailability, listRites, OWN_RITE_ID, readRite, saveRite };
