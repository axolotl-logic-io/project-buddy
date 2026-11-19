// Constructs' stored artwork: who may read it, and when its bytes go. Image
// generation is off, so each test seeds the artwork generation left behind.
import { and, eq } from "drizzle-orm";
import { describe, expect, test } from "vitest";
import { z } from "zod";
import { createChat } from "@/chats/new-chat-store.ts";
import { DEFAULT_CONSTRUCT_ID, snapshotOf } from "@/constructs/index.ts";
import { CONSTRUCT_VISUAL } from "@/constructs/visual.ts";
import { getVisualAsset } from "@/constructs/visual-asset-store.ts";
import { getDb, inTransaction } from "@/db/client.ts";
import {
  constructAssetGrants,
  constructAssets,
} from "@/db/tables/construct-visuals.ts";
import { ownPrompts } from "@/db/tables/own-prompts.ts";
import { seedGeneratedArtwork } from "../../support/test-database/artwork-test-kit.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import {
  cloneConstruct,
  createConstruct,
  deleteConstruct,
  getOwnConstruct,
} from "../../support/test-database/historical-construct-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";

const DESCRIPTION = "A friendly brass owl with a round face and blue wings.";
const DEFINITION = {
  prompt: "Speak calmly.",
  visual: { version: 1, description: DESCRIPTION },
} as const;

async function setup(): Promise<{
  user: Awaited<ReturnType<typeof testUser>>;
  construct: Awaited<ReturnType<typeof createConstruct>>;
  assetId: string;
}> {
  const user = await testUser();
  const construct = await createConstruct(user.id, {
    name: "Owl",
    definition: DEFINITION,
  });
  const assetId = await seedGeneratedArtwork(user.id, construct.id);
  return { user, construct, assetId };
}

test("stored artwork survives a Postgres read and a construct snapshot", async () => {
  const { user, construct, assetId } = await setup();
  const restored = await getOwnConstruct(user.id, construct.id);
  if (restored === undefined) {
    throw new Error("The stored construct was lost");
  }
  const expected = {
    ...DEFINITION,
    visual: {
      ...DEFINITION.visual,
      canonical: { kind: "generated", assetId },
    },
  };
  expect(restored.definition).toMatchObject(expected);
  expect(snapshotOf(restored).definition).toEqual(restored.definition);
});

// A copy of seller's construct that buyer bought before the Marketplace
// closed, as buying left it: buyer's own construct with the seller's saved
// parts, marked bought, and granted the artwork those parts name.
async function legacyBoughtCopy(
  seller: Awaited<ReturnType<typeof testUser>>,
  sourceId: string,
  buyer: Awaited<ReturnType<typeof testUser>>,
): Promise<{ readonly id: string }> {
  const [source] = await getDb()
    .select({ name: ownPrompts.name, parts: ownPrompts.parts })
    .from(ownPrompts)
    .where(and(eq(ownPrompts.userId, seller.id), eq(ownPrompts.id, sourceId)));
  if (source === undefined) {
    throw new Error("No source construct");
  }
  const [copy] = await getDb()
    .insert(ownPrompts)
    .values({
      userId: buyer.id,
      kind: "construct",
      name: source.name,
      parts: source.parts,
      boughtFrom: crypto.randomUUID(),
    })
    .returning({ id: ownPrompts.id });
  if (copy === undefined) {
    throw new Error("No bought copy");
  }
  const visual = CONSTRUCT_VISUAL.parse(
    z.object({ visual: z.unknown() }).parse(source.parts).visual,
  );
  const granted = [visual.canonical, visual.working].flatMap((asset) => {
    if (asset?.kind === "generated") {
      return [{ assetId: asset.assetId, constructId: copy.id }];
    }
    return [];
  });
  if (granted.length > 0) {
    await getDb().insert(constructAssetGrants).values(granted);
  }
  return copy;
}

async function storedAsset(id: string): Promise<{ id: string }[]> {
  return await getDb()
    .select({ id: constructAssets.id })
    .from(constructAssets)
    .where(eq(constructAssets.id, id));
}

describe("legacy construct artwork storage", () => {
  test("artwork is readable only through its owner's destinations", async () => {
    const { user, construct, assetId } = await setup();
    const outsider = await testUser();
    expect(
      await getVisualAsset(
        user.id,
        { kind: "construct", id: construct.id },
        assetId,
      ),
    ).toMatchObject({ mediaType: "image/png" });
    expect(
      await getVisualAsset(
        outsider.id,
        { kind: "construct", id: construct.id },
        assetId,
      ),
    ).toBeUndefined();
    expect(
      await getVisualAsset(
        user.id,
        { kind: "construct", id: crypto.randomUUID() },
        assetId,
      ),
    ).toBeUndefined();
  });

  test("concurrent release of the last two destinations collects their shared bytes", async () => {
    const { user, construct, assetId } = await setup();
    const clone = await cloneConstruct(user.id, construct.id);
    if (clone === undefined) {
      throw new Error("No clone");
    }
    const ready = Promise.withResolvers<void>();
    const destinations = [construct.id, clone.id];
    let arrived = 0;
    await Promise.all(
      destinations.map((id) =>
        inTransaction(async (tx) => {
          // Both independent transactions are open before releasing either grant.
          await tx
            .select({ id: ownPrompts.id })
            .from(ownPrompts)
            .where(eq(ownPrompts.id, id));
          arrived += 1;
          if (arrived === destinations.length) {
            ready.resolve();
          }
          await ready.promise;
          await tx.delete(ownPrompts).where(eq(ownPrompts.id, id));
        }),
      ),
    );
    expect(await storedAsset(assetId)).toEqual([]);
  });

  test("clones, quest snapshots and bought copies retain grants after source deletion", async () => {
    const { user, construct, assetId: id } = await setup();
    const [member, outsider, buyer] = await Promise.all([
      testUser(),
      testUser(),
      testUser(),
    ]);
    const saved = await getOwnConstruct(user.id, construct.id);
    const clone = await cloneConstruct(user.id, construct.id);
    if (saved === undefined || clone === undefined) {
      throw new Error("No construct");
    }
    const quest = await testData(user).quest();
    const chat = await createChat(user.id, {
      quest,
      construct: {
        id: DEFAULT_CONSTRUCT_ID,
        name: saved.name,
        definition: saved.definition,
      },
    });
    const bought = await legacyBoughtCopy(user, construct.id, buyer);
    await getDb()
      .update(ownPrompts)
      .set({ retiredAt: new Date() })
      .where(eq(ownPrompts.id, construct.id));
    expect(
      await getVisualAsset(
        user.id,
        { kind: "construct", id: construct.id },
        id,
      ),
    ).toBeDefined();
    await deleteConstruct(user.id, construct.id);
    expect(
      await getVisualAsset(
        user.id,
        { kind: "construct", id: construct.id },
        id,
      ),
    ).toBeUndefined();
    expect(
      await getVisualAsset(user.id, { kind: "construct", id: clone.id }, id),
    ).toBeDefined();
    expect(
      await getVisualAsset(buyer.id, { kind: "construct", id: bought.id }, id),
    ).toBeDefined();
    expect(
      await getVisualAsset(user.id, { kind: "adventure", id: chat.id }, id),
    ).toBeDefined();
    expect(
      await getVisualAsset(outsider.id, { kind: "adventure", id: chat.id }, id),
    ).toBeUndefined();
    expect(
      await getVisualAsset(member.id, { kind: "adventure", id: chat.id }, id),
    ).toBeUndefined();
  });

  test("forged references roll back writes", async () => {
    const { user, construct } = await setup();
    const outsider = await testUser();
    const saved = await getOwnConstruct(user.id, construct.id);
    await expect(
      createConstruct(outsider.id, {
        name: "Stolen",
        definition: { prompt: "x", visual: saved?.definition.visual },
      }),
    ).rejects.toMatchObject({ errorCase: "not-found" });
  });

  test("collection removes bytes only after the final destination grant is released", async () => {
    const { user, construct, assetId } = await setup();
    const clone = await cloneConstruct(user.id, construct.id);
    if (clone === undefined) {
      throw new Error("No clone");
    }
    await getDb()
      .update(ownPrompts)
      .set({ retiredAt: new Date() })
      .where(eq(ownPrompts.id, clone.id));
    await deleteConstruct(user.id, clone.id);
    expect(
      await getVisualAsset(
        user.id,
        { kind: "construct", id: construct.id },
        assetId,
      ),
    ).toBeDefined();
    await getDb()
      .update(ownPrompts)
      .set({ retiredAt: new Date() })
      .where(eq(ownPrompts.id, construct.id));
    await deleteConstruct(user.id, construct.id);
    expect(await storedAsset(assetId)).toEqual([]);
  });
});
