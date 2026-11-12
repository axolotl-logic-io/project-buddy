import { and, desc, eq, inArray, notInArray, type SQL } from "drizzle-orm";
import { z } from "zod";
import {
  chatOpenTo,
  constructGenerationOwnedBy,
  ownPromptOwnedBy,
} from "@/accounts/owner-scope.ts";
import type { ConstructDefinition } from "@/constructs/construct.ts";
import { parseConstructDefinition } from "@/constructs/construct-definition.ts";
import {
  CONSTRUCT_VISUAL,
  type ConstructVisual,
  normalizeVisualDescription,
  VISUAL_DESTINATION,
  type VisualDestination,
} from "@/constructs/visual.ts";
import { type Database, getDb, type Transaction } from "@/db/client.ts";
import {
  constructAssetGrants,
  constructAssets,
  constructGenerations,
} from "@/db/tables/construct-visuals.ts";
import { ownPrompts } from "@/db/tables/own-prompts.ts";
import { chats } from "@/db/tables/quests-and-chats.ts";
import { AppError } from "@/errors/app-error.ts";
import type { UserId } from "@/ids.ts";

// Only the latest successful, still-granted draft for this saved appearance is recoverable.
async function latestDraftVisual(
  owner: UserId,
  id: string,
  definition: ConstructDefinition,
  db: Database | Transaction = getDb(),
): Promise<ConstructVisual | undefined> {
  const [row] = await db
    .select()
    .from(constructGenerations)
    .where(
      and(
        constructGenerationOwnedBy(owner),
        eq(constructGenerations.constructId, id),
        eq(constructGenerations.status, "generated"),
      ),
    )
    .orderBy(desc(constructGenerations.createdAt))
    .limit(1);
  const visual = CONSTRUCT_VISUAL.safeParse(row?.visual).data;
  if (
    row === undefined ||
    visual?.canonical?.kind !== "generated" ||
    normalizeVisualDescription(
      parseConstructDefinition(row.sourceParts)?.visual?.description ?? "",
    ) !== normalizeVisualDescription(definition.visual?.description ?? "") ||
    (definition.visual?.canonical?.kind === "generated" &&
      visual.canonical.assetId === definition.visual.canonical.assetId)
  ) {
    return undefined;
  }
  if (!(await previousVisualAvailable(owner, id, visual, db))) {
    return undefined;
  }
  return visual;
}

function visualAssetIds(parts: unknown): string[] {
  const visual = parseConstructDefinition(parts)?.visual;
  const ids = [visual?.canonical, visual?.working].flatMap((asset) => {
    if (asset?.kind === "generated") {
      return [asset.assetId];
    }
    return [];
  });
  return [...new Set(ids)];
}
function destinationGrant(destination: VisualDestination): SQL {
  if (destination.kind === "construct") {
    return eq(constructAssetGrants.constructId, destination.id);
  }
  return eq(constructAssetGrants.adventureId, destination.id);
}
// Called in the same transaction as a trusted snapshot/write. A parsed UUID alone
// never grants access.
async function grantVisualAssets(
  owner: UserId,
  tx: Transaction,
  destination: VisualDestination,
  input: {
    readonly parts: unknown;
    readonly retainDraft?: boolean;
  },
): Promise<void> {
  let snapshot: { parts: unknown } | undefined;
  if (destination.kind === "construct") {
    [snapshot] = await tx
      .select({ parts: ownPrompts.parts })
      .from(ownPrompts)
      .where(and(ownPromptOwnedBy(owner), eq(ownPrompts.id, destination.id)))
      .for("share");
  } else {
    [snapshot] = await tx
      .select({ parts: chats.constructParts })
      .from(chats)
      .where(and(chatOpenTo(owner), eq(chats.id, destination.id)))
      .for("share");
  }
  if (snapshot === undefined) {
    throw new AppError("not-found", undefined);
  }
  const ids = visualAssetIds(input.parts);
  const savedIds = visualAssetIds(snapshot.parts);
  if (
    ids.length !== savedIds.length ||
    ids.some((id) => !savedIds.includes(id))
  ) {
    throw new AppError("not-found", undefined);
  }
  if (ids.length > 0) {
    // The destination is already locked and authorized above. Retaining its own
    // grants must not lock sibling constructs during concurrent edits.
    const retained = await tx
      .select({ assetId: constructAssetGrants.assetId })
      .from(constructAssetGrants)
      .where(
        and(
          destinationGrant(destination),
          inArray(constructAssetGrants.assetId, ids),
        ),
      );
    const allowed = new Set(retained.map((row) => row.assetId));
    const missing = ids.filter((id) => !allowed.has(id));
    if (missing.length > 0) {
      const owned = await tx
        .select({ assetId: constructAssetGrants.assetId })
        .from(constructAssetGrants)
        .innerJoin(
          ownPrompts,
          eq(ownPrompts.id, constructAssetGrants.constructId),
        )
        .where(
          and(
            ownPromptOwnedBy(owner),
            inArray(constructAssetGrants.assetId, missing),
          ),
        )
        .for("share", { of: ownPrompts });
      for (const row of owned) {
        allowed.add(row.assetId);
      }
    }
    if (ids.some((id) => !allowed.has(id))) {
      throw new AppError("not-found", undefined);
    }
    await tx
      .insert(constructAssetGrants)
      .values(
        ids.map((assetId): typeof constructAssetGrants.$inferInsert => {
          if (destination.kind === "construct") {
            return { assetId, constructId: destination.id };
          }
          return { assetId, adventureId: destination.id };
        }),
      )
      .onConflictDoNothing();
  }
  const retainedIds = [...ids];
  if (destination.kind === "construct") {
    const [source] = await tx
      .select({ previous: ownPrompts.previousVisual })
      .from(ownPrompts)
      .where(and(ownPromptOwnedBy(owner), eq(ownPrompts.id, destination.id)));
    const previous = CONSTRUCT_VISUAL.safeParse(source?.previous).data;
    retainedIds.push(...visualAssetIds({ prompt: "", visual: previous }));
    const definition = parseConstructDefinition(snapshot.parts);
    if (definition !== undefined && input.retainDraft !== false) {
      const draft = await latestDraftVisual(
        owner,
        destination.id,
        definition,
        tx,
      );
      retainedIds.push(...visualAssetIds({ prompt: "", visual: draft }));
    }
  }
  const predicates = [destinationGrant(destination)];
  if (retainedIds.length > 0) {
    predicates.push(notInArray(constructAssetGrants.assetId, retainedIds));
  }
  await tx.delete(constructAssetGrants).where(and(...predicates));
}

// A recovery entry is usable only while its own destination still holds the
// bytes. An older build may have released those grants during rollback.
async function previousVisualAvailable(
  owner: UserId,
  constructId: string,
  stored: unknown,
  db: Database | Transaction = getDb(),
): Promise<boolean> {
  const previous = CONSTRUCT_VISUAL.safeParse(stored).data;
  if (
    previous === undefined ||
    (previous.canonical === undefined && previous.working === undefined)
  ) {
    return false;
  }
  const ids = visualAssetIds({ prompt: "", visual: previous });
  if (ids.length === 0) {
    return true;
  }
  const granted = await db
    .select({ id: constructAssets.id })
    .from(constructAssetGrants)
    .innerJoin(
      constructAssets,
      eq(constructAssets.id, constructAssetGrants.assetId),
    )
    .innerJoin(ownPrompts, eq(ownPrompts.id, constructAssetGrants.constructId))
    .where(
      and(
        ownPromptOwnedBy(owner),
        eq(constructAssetGrants.constructId, constructId),
        inArray(constructAssets.id, ids),
      ),
    );
  return ids.every((id) => granted.some((asset) => asset.id === id));
}

async function getVisualAsset(
  owner: UserId,
  destination: VisualDestination,
  assetId: string,
): Promise<{ mediaType: string; data: string } | undefined> {
  if (
    !(
      VISUAL_DESTINATION.safeParse(destination).success &&
      z.uuid().safeParse(assetId).success
    )
  ) {
    return undefined;
  }
  const selection = {
    mediaType: constructAssets.mediaType,
    data: constructAssets.data,
  };
  const predicates = [
    destinationGrant(destination),
    eq(constructAssets.id, assetId),
  ];
  const base = getDb()
    .select({ ...selection, parts: ownPrompts.parts })
    .from(constructAssets)
    .innerJoin(
      constructAssetGrants,
      eq(constructAssetGrants.assetId, constructAssets.id),
    );
  let asset: { mediaType: string; data: string; parts: unknown } | undefined;
  if (destination.kind === "construct") {
    [asset] = await base
      .innerJoin(
        ownPrompts,
        eq(ownPrompts.id, constructAssetGrants.constructId),
      )
      .where(and(...predicates, ownPromptOwnedBy(owner)));
  } else {
    [asset] = await getDb()
      .select({ ...selection, parts: chats.constructParts })
      .from(constructAssets)
      .innerJoin(
        constructAssetGrants,
        eq(constructAssetGrants.assetId, constructAssets.id),
      )
      .innerJoin(chats, eq(chats.id, constructAssetGrants.adventureId))
      .where(and(...predicates, chatOpenTo(owner)));
  }
  if (
    asset !== undefined &&
    destination.kind === "construct" &&
    !visualAssetIds(asset.parts).includes(assetId)
  ) {
    const definition = parseConstructDefinition(asset.parts);
    if (definition !== undefined) {
      const visual = await latestDraftVisual(owner, destination.id, definition);
      if (visualAssetIds({ prompt: "", visual }).includes(assetId)) {
        return { mediaType: asset.mediaType, data: asset.data };
      }
    }
  }
  if (asset === undefined || !visualAssetIds(asset.parts).includes(assetId)) {
    return undefined;
  }
  return { mediaType: asset.mediaType, data: asset.data };
}

export {
  destinationGrant,
  getVisualAsset,
  grantVisualAssets,
  latestDraftVisual,
  previousVisualAvailable,
  visualAssetIds,
};
