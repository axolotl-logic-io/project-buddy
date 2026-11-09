import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import {
  constructGenerationOwnedBy,
  ownPromptOwnedBy,
} from "@/accounts/owner-scope.ts";
import {
  parseConstructDefinition,
  storedConstructPrompt,
} from "@/constructs/construct-definition.ts";
import { CONSTRUCT_VISUAL } from "@/constructs/visual.ts";
import {
  grantVisualAssets,
  previousVisualAvailable,
} from "@/constructs/visual-asset-store.ts";
import { inTransaction } from "@/db/client.ts";
import { constructGenerations } from "@/db/tables/construct-visuals.ts";
import { ownPrompts } from "@/db/tables/own-prompts.ts";
import type { UserId } from "@/ids.ts";

// Restores one previous image and its description. Text and snapshot consumers
// stay unchanged. Repeating a successful restore is a no-op, never a generation.
async function restoreConstructVisual(
  owner: UserId,
  id: string,
): Promise<boolean> {
  if (!z.uuid().safeParse(id).success) {
    return false;
  }
  return await inTransaction(async (tx) => {
    const [source] = await tx
      .select()
      .from(ownPrompts)
      .where(
        and(
          ownPromptOwnedBy(owner),
          eq(ownPrompts.id, id),
          eq(ownPrompts.kind, "buddy"),
          isNull(ownPrompts.retiredAt),
        ),
      )
      .for("update");
    const definition = parseConstructDefinition(source?.parts);
    const visual = CONSTRUCT_VISUAL.safeParse(source?.previousVisual).data;
    if (
      source === undefined ||
      definition === undefined ||
      visual === undefined
    ) {
      return false;
    }
    if (
      !(await previousVisualAvailable(owner, id, source.previousVisual, tx))
    ) {
      return false;
    }
    const [pending] = await tx
      .select({ id: constructGenerations.id })
      .from(constructGenerations)
      .where(
        and(
          constructGenerationOwnedBy(owner),
          eq(constructGenerations.constructId, id),
          eq(constructGenerations.status, "pending"),
        ),
      )
      .limit(1);
    if (pending !== undefined) {
      return false;
    }
    const parts = storedConstructPrompt({ ...definition, visual });
    await tx
      .update(ownPrompts)
      .set({ parts, previousVisual: null, updatedAt: sql`now()` })
      .where(and(ownPromptOwnedBy(owner), eq(ownPrompts.id, id)));
    await grantVisualAssets(
      owner,
      tx,
      { kind: "construct", id },
      { parts, retainDraft: false },
    );
    return true;
  });
}

export { restoreConstructVisual };
