// Seeds definitions made by old builds, so retained snapshots and artwork can
// be exercised without bringing custom construct operations back into the app.
import { and, eq, isNull } from "drizzle-orm";
import { ownPromptOwnedBy } from "@/accounts/owner-scope.ts";
import {
  parseConstructDefinition,
  storedConstructPrompt,
} from "@/constructs/construct-definition.ts";
import {
  type ConstructDefinition,
  getConstruct,
  isConstructId,
} from "@/constructs/index.ts";
import { grantVisualAssets } from "@/constructs/visual-asset-store.ts";
import { getDb, inTransaction } from "@/db/client.ts";
import { ownPrompts } from "@/db/tables/own-prompts.ts";
import { OWN_PROMPT_ID, type UserId } from "@/ids.ts";
import type { OwnPrompt } from "@/prompts/own-prompt-store.ts";
import type { NamedDefinition } from "@/prompts/prompt.ts";

type OwnConstruct = OwnPrompt<ConstructDefinition>;
function fromRow(row: typeof ownPrompts.$inferSelect): OwnConstruct {
  const definition = parseConstructDefinition(row.parts);
  if (definition === undefined) {
    throw new Error("Invalid historical construct");
  }
  return {
    id: OWN_PROMPT_ID.parse(row.id),
    name: row.name,
    definition,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    clonedFrom: row.clonedFrom ?? undefined,
  };
}
function createConstruct(
  owner: UserId,
  input: NamedDefinition<ConstructDefinition>,
): Promise<OwnConstruct> {
  return inTransaction(async (tx) => {
    const [row] = await tx
      .insert(ownPrompts)
      .values({
        userId: owner,
        kind: "construct",
        name: input.name,
        parts: storedConstructPrompt(input.definition),
      })
      .returning();
    if (row === undefined) {
      throw new Error("No historical construct");
    }
    await grantVisualAssets(
      owner,
      tx,
      { kind: "construct", id: row.id },
      { parts: input.definition },
    );
    return fromRow(row);
  });
}
async function getOwnConstruct(
  owner: UserId,
  id: string,
): Promise<OwnConstruct | undefined> {
  const [row] = await getDb()
    .select()
    .from(ownPrompts)
    .where(
      and(
        ownPromptOwnedBy(owner),
        eq(ownPrompts.kind, "construct"),
        eq(ownPrompts.id, id),
        isNull(ownPrompts.retiredAt),
      ),
    );
  if (row !== undefined) {
    return fromRow(row);
  }
  return undefined;
}
async function cloneConstruct(
  owner: UserId,
  id: string,
): Promise<OwnConstruct | undefined> {
  let source: NamedDefinition<ConstructDefinition> | undefined;
  if (isConstructId(id)) {
    source = getConstruct(id);
  } else {
    source = await getOwnConstruct(owner, id);
  }
  if (source === undefined) {
    return undefined;
  }
  const copy = await createConstruct(owner, {
    name: `${source.name} (copy)`,
    definition: source.definition,
  });
  await getDb()
    .update(ownPrompts)
    .set({ clonedFrom: id })
    .where(and(ownPromptOwnedBy(owner), eq(ownPrompts.id, copy.id)));
  return { ...copy, clonedFrom: id };
}
async function deleteConstruct(owner: UserId, id: string): Promise<boolean> {
  const rows = await getDb()
    .delete(ownPrompts)
    .where(and(ownPromptOwnedBy(owner), eq(ownPrompts.id, id)))
    .returning();
  return rows.length > 0;
}

export type { OwnConstruct };
export { cloneConstruct, createConstruct, deleteConstruct, getOwnConstruct };
