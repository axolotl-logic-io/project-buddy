// Shared ownership, cloning and transaction behavior for saved definitions. The parts column is a legacy storage detail.

import { and, asc, eq, isNull, type SQL, sql } from "drizzle-orm";
import { ownPromptOwnedBy } from "@/accounts/owner-scope.ts";
import { getDb, inTransaction } from "@/db/client.ts";
import { ownPrompts } from "@/db/tables/own-prompts.ts";
import { AppError } from "@/errors/app-error.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import { type OwnPromptId, parseOwnPromptId, type UserId } from "@/ids.ts";
import type { NamedDefinition } from "@/prompts/prompt.ts";

interface DefinitionLimits<Definition> {
  readonly nameMax: number;
  readonly definitionFits: (parts: Definition) => boolean;
}

interface DefinitionStore<Definition> {
  readonly kind: "spell";
  readonly encodeDefinition?: (text: Definition) => unknown;
  readonly parseDefinition: (stored: unknown) => Definition | undefined;
  readonly builtIn: (id: string) => NamedDefinition<Definition> | undefined;
  readonly limits?: DefinitionLimits<Definition>;
}

interface OwnPrompt<Definition> extends NamedDefinition<Definition> {
  readonly id: OwnPromptId;
  readonly clonedFrom: string | undefined;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

interface DefinitionEdit<Definition> {
  readonly name?: string;
  readonly definition?: Definition;
}

type OwnPromptRow = typeof ownPrompts.$inferSelect;

const COPY_SUFFIX = " (copy)";

function withinLimits<Definition>(
  store: DefinitionStore<Definition>,
  edit: DefinitionEdit<Definition>,
): boolean {
  const { limits } = store;
  if (limits === undefined) {
    return true;
  }
  const nameFits =
    edit.name === undefined || edit.name.length <= limits.nameMax;
  const definitionFits =
    edit.definition === undefined || limits.definitionFits(edit.definition);
  return nameFits && definitionFits;
}

function checkLimits<Definition>(
  store: DefinitionStore<Definition>,
  edit: DefinitionEdit<Definition>,
): void {
  if (!withinLimits(store, edit)) {
    throw new AppError(
      "unknown",
      new Error(`A ${store.kind}'s name or parts are longer than it allows`),
    );
  }
}

function cloneName<Definition>(
  store: DefinitionStore<Definition>,
  sourceName: string,
): string {
  const max = store.limits?.nameMax;
  const full = `${sourceName}${COPY_SUFFIX}`;
  if (max === undefined || full.length <= max) {
    return full;
  }
  let kept = "";
  for (const character of sourceName) {
    if (kept.length + character.length + COPY_SUFFIX.length > max) {
      break;
    }
    kept += character;
  }
  return `${kept.trimEnd()}${COPY_SUFFIX}`;
}

function toPrompts<Definition>(
  store: DefinitionStore<Definition>,
  rows: readonly OwnPromptRow[],
): OwnPrompt<Definition>[] {
  return rows.flatMap((row) => {
    const id = parseOwnPromptId(row.id);
    const parts = store.parseDefinition(row.parts);
    if (id === undefined || parts === undefined) {
      return [];
    }
    return [
      {
        id,
        name: row.name,
        definition: parts,
        clonedFrom: row.clonedFrom ?? undefined,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
    ];
  });
}

function ownedOfKind(owner: UserId, kind: "spell"): SQL | undefined {
  return and(
    ownPromptOwnedBy(owner),
    eq(ownPrompts.kind, kind),
    isNull(ownPrompts.retiredAt),
  );
}

function ownedPrompt(
  owner: UserId,
  kind: "spell",
  id: OwnPromptId,
): SQL | undefined {
  return and(eq(ownPrompts.id, id), ownedOfKind(owner, kind));
}

function listOwnPrompts<Definition>(
  store: DefinitionStore<Definition>,
  owner: UserId,
): Promise<OwnPrompt<Definition>[]> {
  return withAppErrors("listOwnPrompts", async () =>
    toPrompts(
      store,
      await getDb()
        .select()
        .from(ownPrompts)
        .where(ownedOfKind(owner, store.kind))
        .orderBy(asc(ownPrompts.createdAt), asc(ownPrompts.id)),
    ),
  );
}

async function getOwnPrompt<Definition>(
  store: DefinitionStore<Definition>,
  owner: UserId,
  id: string,
): Promise<OwnPrompt<Definition> | undefined> {
  const promptId = parseOwnPromptId(id);
  if (promptId === undefined) {
    return undefined;
  }
  const [prompt] = await withAppErrors("getOwnPrompt", async () =>
    toPrompts(
      store,
      await getDb()
        .select()
        .from(ownPrompts)
        .where(ownedPrompt(owner, store.kind, promptId)),
    ),
  );
  return prompt;
}

async function createOwnPrompt<Definition>(
  store: DefinitionStore<Definition>,
  owner: UserId,
  prompt: NamedDefinition<Definition>,
): Promise<OwnPrompt<Definition>> {
  checkLimits(store, prompt);
  return await withAppErrors("createOwnPrompt", () =>
    inTransaction(async (tx) => {
      const [created] = toPrompts(
        store,
        await tx
          .insert(ownPrompts)
          .values({
            userId: owner,
            kind: store.kind,
            name: prompt.name,
            parts:
              store.encodeDefinition?.(prompt.definition) ?? prompt.definition,
          })
          .returning(),
      );
      if (created === undefined) {
        throw new AppError(
          "database-query-failed",
          new Error("The new prompt was not returned"),
        );
      }

      return created;
    }),
  );
}

function cloneSource<Definition>(
  store: DefinitionStore<Definition>,
  owner: UserId,
  sourceId: string,
): Promise<NamedDefinition<Definition> | undefined> {
  const builtIn = store.builtIn(sourceId);
  if (builtIn !== undefined) {
    return Promise.resolve(builtIn);
  }
  return getOwnPrompt(store, owner, sourceId);
}

async function cloneOwnPrompt<Definition>(
  store: DefinitionStore<Definition>,
  owner: UserId,
  sourceId: string,
): Promise<OwnPrompt<Definition> | undefined> {
  const source = await cloneSource(store, owner, sourceId);
  if (source === undefined) {
    return undefined;
  }
  const name = cloneName(store, source.name);
  checkLimits(store, { name, definition: source.definition });
  const [clone] = await withAppErrors("cloneOwnPrompt", () =>
    inTransaction(async (tx) => {
      const clones = toPrompts(
        store,
        await tx
          .insert(ownPrompts)
          .values({
            userId: owner,
            kind: store.kind,
            name,
            parts:
              store.encodeDefinition?.(source.definition) ?? source.definition,
            clonedFrom: sourceId.toLowerCase(),
          })
          .returning(),
      );

      return clones;
    }),
  );
  return clone;
}

async function updateOwnPrompt<Definition>(
  store: DefinitionStore<Definition>,
  owner: UserId,
  id: string,
  edit: DefinitionEdit<Definition>,
): Promise<OwnPrompt<Definition> | undefined> {
  checkLimits(store, edit);
  const promptId = parseOwnPromptId(id);
  if (promptId === undefined) {
    return undefined;
  }
  let storedEdit: unknown;
  if (edit.definition !== undefined) {
    storedEdit = store.encodeDefinition?.(edit.definition) ?? edit.definition;
  }
  const [prompt] = await withAppErrors("updateOwnPrompt", () =>
    inTransaction(async (tx) => {
      const prompts = toPrompts(
        store,
        await tx
          .update(ownPrompts)
          .set({ name: edit.name, parts: storedEdit, updatedAt: sql`now()` })
          .where(ownedPrompt(owner, store.kind, promptId))
          .returning(),
      );

      return prompts;
    }),
  );
  return prompt;
}

export type { DefinitionEdit, DefinitionStore, OwnPrompt };
export {
  cloneOwnPrompt,
  createOwnPrompt,
  getOwnPrompt,
  listOwnPrompts,
  updateOwnPrompt,
};
