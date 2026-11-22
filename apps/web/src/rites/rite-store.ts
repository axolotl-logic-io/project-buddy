import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { riteOwnedBy } from "@/accounts/owner-scope.ts";
import { getDb } from "@/db/client.ts";
import { rites } from "@/db/tables/performances.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import type { UserId } from "@/ids.ts";
import { BUILT_IN_RITES, RITE_DEFINITION, type Rite } from "./rite.ts";

function asRite(row: typeof rites.$inferSelect): Rite {
  return { ...RITE_DEFINITION.parse(row), id: row.id, source: "own" };
}

function listRites(user: UserId): Promise<Rite[]> {
  return withAppErrors("listRites", async () => {
    const own = await getDb()
      .select()
      .from(rites)
      .where(and(riteOwnedBy(user), isNull(rites.forgottenAt)))
      .orderBy(rites.name);
    return [...BUILT_IN_RITES, ...own.map(asRite)];
  });
}

function readRite(user: UserId, id: string): Promise<Rite | undefined> {
  const builtIn = BUILT_IN_RITES.find((rite) => rite.id === id);
  if (builtIn !== undefined) {
    return Promise.resolve(builtIn);
  }
  if (!z.guid().safeParse(id).success) {
    return Promise.resolve(undefined);
  }
  return withAppErrors("readRite", async () => {
    const [row] = await getDb()
      .select()
      .from(rites)
      .where(
        and(eq(rites.id, id), riteOwnedBy(user), isNull(rites.forgottenAt)),
      );
    if (row === undefined) {
      return;
    }
    return asRite(row);
  });
}

export { listRites, readRite };
