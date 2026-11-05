import { and, eq, inArray, isNull, notInArray, type SQL } from "drizzle-orm";
import { z } from "zod";
import {
  chatOpenTo,
  listingOpenTo,
  listingSoldBy,
  ownPromptOwnedBy,
} from "@/accounts/owner-scope.ts";
import { parseConstructDefinition } from "@/constructs/construct-definition.ts";
import {
  VISUAL_DESTINATION,
  type VisualDestination,
} from "@/constructs/visual.ts";
import { getDb, type Transaction } from "@/db/client.ts";
import {
  constructAssetGrants,
  constructAssets,
} from "@/db/tables/construct-visuals.ts";
import { listings } from "@/db/tables/listings.ts";
import { ownPrompts } from "@/db/tables/own-prompts.ts";
import { chats } from "@/db/tables/projects-and-chats.ts";
import { AppError } from "@/errors/app-error.ts";
import type { UserId } from "@/ids.ts";

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
  switch (destination.kind) {
    case "construct":
      return eq(constructAssetGrants.constructId, destination.id);
    case "adventure":
      return eq(constructAssetGrants.adventureId, destination.id);
    default:
      return eq(constructAssetGrants.listingId, destination.id);
  }
}
// Called in the same transaction as a trusted snapshot/write. A parsed UUID alone
// never grants access. Bought copies can inherit only their published listing.
async function grantVisualAssets(
  owner: UserId,
  tx: Transaction,
  destination: VisualDestination,
  input: { readonly parts: unknown; readonly boughtFrom?: string },
): Promise<void> {
  let snapshot: { parts: unknown } | undefined;
  if (destination.kind === "construct") {
    [snapshot] = await tx
      .select({ parts: ownPrompts.parts })
      .from(ownPrompts)
      .where(and(ownPromptOwnedBy(owner), eq(ownPrompts.id, destination.id)))
      .for("share");
  } else if (destination.kind === "adventure") {
    [snapshot] = await tx
      .select({ parts: chats.constructParts })
      .from(chats)
      .where(and(chatOpenTo(owner), eq(chats.id, destination.id)))
      .for("share");
  } else {
    [snapshot] = await tx
      .select({ parts: listings.parts })
      .from(listings)
      .where(and(listingSoldBy(owner), eq(listings.id, destination.id)))
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
    if (input.boughtFrom !== undefined) {
      const listed = await tx
        .select({
          assetId: constructAssetGrants.assetId,
          parts: listings.parts,
        })
        .from(listings)
        .innerJoin(
          constructAssetGrants,
          eq(constructAssetGrants.listingId, listings.id),
        )
        .where(
          and(
            eq(listings.id, input.boughtFrom),
            listingOpenTo(owner),
            isNull(listings.unlistedAt),
            inArray(constructAssetGrants.assetId, ids),
          ),
        )
        .for("share", { of: listings });
      for (const row of listed) {
        if (visualAssetIds(row.parts).includes(row.assetId)) {
          allowed.add(row.assetId);
        }
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
          if (destination.kind === "adventure") {
            return { assetId, adventureId: destination.id };
          }
          return { assetId, listingId: destination.id };
        }),
      )
      .onConflictDoNothing();
  }
  const predicates = [destinationGrant(destination)];
  if (ids.length > 0) {
    predicates.push(notInArray(constructAssetGrants.assetId, ids));
  }
  await tx.delete(constructAssetGrants).where(and(...predicates));
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
  } else if (destination.kind === "adventure") {
    [asset] = await getDb()
      .select({ ...selection, parts: chats.constructParts })
      .from(constructAssets)
      .innerJoin(
        constructAssetGrants,
        eq(constructAssetGrants.assetId, constructAssets.id),
      )
      .innerJoin(chats, eq(chats.id, constructAssetGrants.adventureId))
      .where(and(...predicates, chatOpenTo(owner)));
  } else {
    [asset] = await getDb()
      .select({ ...selection, parts: listings.parts })
      .from(constructAssets)
      .innerJoin(
        constructAssetGrants,
        eq(constructAssetGrants.assetId, constructAssets.id),
      )
      .innerJoin(listings, eq(listings.id, constructAssetGrants.listingId))
      .where(and(...predicates, listingOpenTo(owner)));
  }
  if (asset === undefined || !visualAssetIds(asset.parts).includes(assetId)) {
    return undefined;
  }
  return { mediaType: asset.mediaType, data: asset.data };
}

export { destinationGrant, getVisualAsset, grantVisualAssets, visualAssetIds };
