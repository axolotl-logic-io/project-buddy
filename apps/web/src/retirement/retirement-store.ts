// Retirement preserves identity and source tracking.
// Normal definition stores read only active definitions; this module alone
// reads retired ones and permanently deletes them through the Retirement UI.

import { and, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { ownPromptOwnedBy } from "@/accounts/owner-scope.ts";
import { parseConstructDefinition } from "@/constructs/construct-definition.ts";
import { getDb } from "@/db/client.ts";
import { ownPrompts } from "@/db/tables/own-prompts.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import { OWN_PROMPT_ID, parseOwnPromptId, type UserId } from "@/ids.ts";
import { type PromptKind, STORED_PROMPT_KIND } from "@/prompts/prompt.ts";

const RETIRED_ROW = z.object({
  id: OWN_PROMPT_ID,
  kind: STORED_PROMPT_KIND,
  name: z.string(),
  retiredAt: z.date(),
});
type RetiredDefinition = z.infer<typeof RETIRED_ROW>;
interface RetiredText {
  readonly name: "prompt";
  readonly text: string;
}
interface RetiredDetail extends RetiredDefinition {
  readonly texts: readonly RetiredText[];
}

async function listRetiredDefinitions(
  owner: UserId,
): Promise<RetiredDefinition[]> {
  const rows = await withAppErrors("list retirement", () =>
    getDb()
      .select({
        id: ownPrompts.id,
        kind: ownPrompts.kind,
        name: ownPrompts.name,
        retiredAt: ownPrompts.retiredAt,
      })
      .from(ownPrompts)
      .where(and(ownPromptOwnedBy(owner), isNotNull(ownPrompts.retiredAt)))
      .orderBy(desc(ownPrompts.retiredAt), desc(ownPrompts.id)),
  );
  return rows.flatMap((row) => {
    const parsed = RETIRED_ROW.safeParse(row);
    if (!parsed.success) {
      return [];
    }
    return [parsed.data];
  });
}

function textsOf(stored: unknown): RetiredText[] | undefined {
  const parsed = parseConstructDefinition(stored);
  if (parsed === undefined) {
    return undefined;
  }
  return [{ name: "prompt", text: parsed.prompt }];
}

async function getRetiredDefinition(
  owner: UserId,
  id: string,
): Promise<RetiredDetail | undefined> {
  const promptId = parseOwnPromptId(id);
  if (promptId === undefined) {
    return;
  }
  const [row] = await withAppErrors("read retirement", () =>
    getDb()
      .select()
      .from(ownPrompts)
      .where(
        and(
          ownPromptOwnedBy(owner),
          eq(ownPrompts.id, promptId),
          isNotNull(ownPrompts.retiredAt),
        ),
      ),
  );
  const parsed = RETIRED_ROW.safeParse(row);
  if (!parsed.success || row === undefined) {
    return;
  }
  const texts = textsOf(row.parts);
  if (texts === undefined) {
    return;
  }
  return { ...parsed.data, texts };
}

// A repeat retirement preserves its first retirement date. A foreign id,
// a built-in id, or an id of another kind never changes a definition.
async function retireDefinition(
  owner: UserId,
  kind: PromptKind,
  id: string,
): Promise<boolean> {
  const promptId = parseOwnPromptId(id);
  if (promptId === undefined) {
    return false;
  }
  const changed = await withAppErrors("retire definition", () =>
    getDb()
      .update(ownPrompts)
      .set({ retiredAt: sql`now()` })
      .where(
        and(
          ownPromptOwnedBy(owner),
          eq(ownPrompts.id, promptId),
          eq(ownPrompts.kind, kind),
          isNull(ownPrompts.retiredAt),
        ),
      )
      .returning({ id: ownPrompts.id }),
  );
  return changed.length > 0;
}

async function restoreDefinition(owner: UserId, id: string): Promise<boolean> {
  const promptId = parseOwnPromptId(id);
  if (promptId === undefined) {
    return false;
  }
  const changed = await withAppErrors("restore definition", () =>
    getDb()
      .update(ownPrompts)
      .set({ retiredAt: null })
      .where(
        and(
          ownPromptOwnedBy(owner),
          eq(ownPrompts.id, promptId),
          isNotNull(ownPrompts.retiredAt),
        ),
      )
      .returning({ id: ownPrompts.id }),
  );
  return changed.length > 0;
}

// The retirement predicate also protects against a stale delete form that
// races with restoration: an active definition cannot be deleted here.
async function deleteRetiredDefinition(
  owner: UserId,
  id: string,
): Promise<boolean> {
  const promptId = parseOwnPromptId(id);
  if (promptId === undefined) {
    return false;
  }
  const changed = await withAppErrors("delete retired definition", () =>
    getDb()
      .delete(ownPrompts)
      .where(
        and(
          ownPromptOwnedBy(owner),
          eq(ownPrompts.id, promptId),
          isNotNull(ownPrompts.retiredAt),
        ),
      )
      .returning({ id: ownPrompts.id }),
  );
  return changed.length > 0;
}

export type { RetiredDefinition, RetiredDetail };
export {
  deleteRetiredDefinition,
  getRetiredDefinition,
  listRetiredDefinitions,
  restoreDefinition,
  retireDefinition,
};
