import { and, eq } from "drizzle-orm";
import sharp from "sharp";
import { describe, expect, test, vi } from "vitest";
import { z } from "zod";
import { createChat } from "@/chats/new-chat-store.ts";
import type { AvatarFramer } from "@/constructs/avatar-frame.ts";
import {
  cloneConstruct,
  createConstruct,
  deleteConstruct,
  getOwnConstruct,
  updateConstruct,
} from "@/constructs/construct-store.ts";
import { DEFAULT_CONSTRUCT_ID, getConstruct } from "@/constructs/index.ts";
import { restoreConstructVisual } from "@/constructs/restore-visual.ts";
import { getVisualAsset } from "@/constructs/visual-asset-store.ts";
import { editConstructMetadata } from "@/constructs/visual-edit-store.ts";
import {
  generateConstructVisual,
  readVisualGeneration,
} from "@/constructs/visual-generation.ts";
import type { VisualGenerationResult } from "@/constructs/visual-generation-contract.ts";
import { getDb, inTransaction } from "@/db/client.ts";
import {
  constructAssetGrants,
  constructAssets,
  constructGenerations,
} from "@/db/tables/construct-visuals.ts";
import { marketplaceCutover } from "@/db/tables/orbs.ts";
import { ownPrompts } from "@/db/tables/own-prompts.ts";
import type { GeneratedImage, ImageProvider } from "@/images/image-provider.ts";
import { IMAGE_RESERVATION_MICRO_USD } from "@/images/image-provider.ts";
import { buyListing } from "@/marketplace/buy-listing.ts";
import {
  publishListing,
  unlistListing,
  updateListing,
} from "@/marketplace/listing-store.ts";
import { earlierConstructText } from "@/prompts/earlier-built-in-texts.ts";
import { matchingBuiltInConstruct } from "@/prompts/matching-built-in.ts";
import { retireDefinition } from "@/retirement/retirement-store.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { formerMembership } from "../../support/test-database/former-member-test-kit.ts";
import {
  goldSpent,
  spendGold,
} from "../../support/test-database/gold-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";

const INITIAL_RESERVATIONS = 3;
const LEGACY_DIGEST_LENGTH = 64;
const COST = 10_000;
const FRAMING_COST = 120;
const DESCRIPTION = "A friendly brass owl with a round face and blue wings.";
const DEFINITION = {
  prompt: "Speak calmly.",
  visual: { version: 1, description: DESCRIPTION },
} as const;
async function image(): Promise<GeneratedImage> {
  return {
    bytes: await sharp({
      create: { width: 32, height: 32, channels: 3, background: "white" },
    })
      .png()
      .toBuffer(),
    mediaType: "image/png",
    costMicroUsd: COST,
  };
}
async function setup(): Promise<{
  user: Awaited<ReturnType<typeof testUser>>;
  construct: Awaited<ReturnType<typeof createConstruct>>;
  provider: {
    generate: ReturnType<typeof vi.fn<() => Promise<GeneratedImage>>>;
  };
  request: { constructId: string; requestId: string; description: string };
}> {
  const user = await testUser();
  const construct = await createConstruct(user.id, {
    name: "Owl",
    definition: DEFINITION,
  });
  return {
    user,
    construct,
    provider: { generate: vi.fn(image) },
    request: {
      constructId: construct.id,
      requestId: crypto.randomUUID(),
      description: DESCRIPTION,
    },
  };
}
function assetId(result: VisualGenerationResult): string {
  const asset = result.visual?.canonical;
  if (asset?.kind !== "generated") {
    throw new Error("Expected generated art");
  }
  return asset.assetId;
}
describe("use_case_generate_construct_visual", () => {
  test("concurrent release of the last two destinations collects their shared bytes", async () => {
    const { user, construct, provider, request } = await setup();
    const generated = await generateConstructVisual(user.id, request, provider);
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
    expect(
      await getDb()
        .select({ id: constructAssets.id })
        .from(constructAssets)
        .where(eq(constructAssets.id, assetId(generated))),
    ).toEqual([]);
  });
  test("generates once and isolates replays and private bytes", async () => {
    const { user, construct, provider, request } = await setup();
    const outsider = await testUser();
    expect(
      (await generateConstructVisual(outsider.id, request, provider)).status,
    ).toBe("not-found");
    const generated = await generateConstructVisual(user.id, request, provider);
    expect(generated.status).toBe("generated");
    expect(await generateConstructVisual(user.id, request, provider)).toEqual(
      generated,
    );
    expect(
      (
        await generateConstructVisual(
          user.id,
          { ...request, description: "different" },
          provider,
        )
      ).status,
    ).toBe("stale");
    expect(
      (
        await generateConstructVisual(
          user.id,
          { ...request, constructId: crypto.randomUUID() },
          provider,
        )
      ).status,
    ).toBe("stale");
    expect(provider.generate).toHaveBeenCalledTimes(1);
    expect(await goldSpent(user)).toBe(COST);
    expect(
      await getVisualAsset(
        user.id,
        { kind: "construct", id: construct.id },
        assetId(generated),
      ),
    ).toMatchObject({ mediaType: "image/webp" });
    expect(
      await getVisualAsset(
        outsider.id,
        { kind: "construct", id: construct.id },
        assetId(generated),
      ),
    ).toBeUndefined();
    expect(
      await getVisualAsset(
        user.id,
        { kind: "construct", id: crypto.randomUUID() },
        assetId(generated),
      ),
    ).toBeUndefined();
    expect(await readVisualGeneration(user.id, construct.id)).toMatchObject({
      outdated: false,
      reservationGold: 25,
    });
  });
  test.each([
    {
      found: { x: 0.4, y: 0.3, size: 0.35 },
      avatar: { x: 0.4, y: 0.3, size: 0.35 },
    },
    { found: undefined, avatar: { x: 0.5, y: 0.5, size: 0.5 } },
  ])(
    "the avatar frame is chosen from the generated image, and framing joins its charge",
    async ({ found, avatar }) => {
      const { user, construct, provider, request } = await setup();
      const framer = {
        frame: vi.fn<AvatarFramer["frame"]>(async () => ({
          frame: found,
          costMicroUsd: FRAMING_COST,
        })),
      };
      const generated = await generateConstructVisual(
        user.id,
        request,
        provider,
        { saved: false, regenerate: false, framer },
      );
      expect(generated.visual?.frames).toEqual({ avatar });
      expect(
        (await getOwnConstruct(user.id, construct.id))?.definition.visual
          ?.frames,
      ).toEqual({ avatar });
      expect(framer.frame).toHaveBeenCalledTimes(1);
      expect(
        (await sharp(framer.frame.mock.calls[0]?.[0]).metadata()).format,
      ).toBe("webp");
      expect(await goldSpent(user)).toBe(COST + FRAMING_COST);
    },
  );
  test("read-only recovery and concurrent replay make no paid call; stale completion keeps prior art", async () => {
    const { user, construct, request, provider: initial } = await setup();
    const first = await generateConstructVisual(user.id, request, initial);
    const next = { ...request, requestId: crypto.randomUUID() };
    const event = Promise.withResolvers<GeneratedImage>();
    const started = Promise.withResolvers<void>();
    const provider: ImageProvider = {
      generate: vi.fn(() => {
        started.resolve();
        return event.promise;
      }),
    };
    const pending = generateConstructVisual(user.id, next, provider);
    await started.promise;
    expect(await readVisualGeneration(user.id, construct.id)).toMatchObject({
      pendingRequestId: next.requestId,
      result: { status: "pending" },
    });
    expect(
      (await generateConstructVisual(user.id, next, provider)).status,
    ).toBe("pending");
    expect(
      (
        await generateConstructVisual(
          user.id,
          { ...next, requestId: crypto.randomUUID() },
          provider,
        )
      ).status,
    ).toBe("pending");
    expect(
      await editConstructMetadata(user.id, construct.id, {
        name: "Owl",
        prompt: "Speak brightly.",
        visualDescription: "A blue owl with a silver face.",
      }),
    ).toMatchObject({ kind: "saved" });
    expect(await readVisualGeneration(user.id, construct.id)).toMatchObject({
      pendingRequestId: next.requestId,
      pendingDescription: DESCRIPTION,
    });
    event.resolve(await image());
    expect((await pending).status).toBe("stale");
    expect(
      (await getOwnConstruct(user.id, construct.id))?.definition.visual,
    ).toEqual({
      ...first.visual,
      description: "A blue owl with a silver face.",
    });
    expect(await readVisualGeneration(user.id, construct.id)).toMatchObject({
      outdated: true,
    });
    expect(await goldSpent(user)).toBe(COST * 2);
    expect(provider.generate).toHaveBeenCalledTimes(1);
    expect(
      await editConstructMetadata(user.id, construct.id, {
        name: "Owl",
        prompt: "x",
        visualDescription: "",
      }),
    ).toEqual({ kind: "description-required" });
  });
  test("failure and invalid bytes retain old assets and conservative reservation; unavailable and unsaved calls charge nothing", async () => {
    const { user, construct, provider, request } = await setup();
    const first = await generateConstructVisual(user.id, request, provider);
    const failedRequest = { ...request, requestId: crypto.randomUUID() };
    expect(
      (
        await generateConstructVisual(user.id, failedRequest, {
          generate: (): Promise<GeneratedImage> =>
            Promise.reject(new Error("unknown billing")),
        })
      ).status,
    ).toBe("failed");
    expect(
      (await generateConstructVisual(user.id, failedRequest, provider)).status,
    ).toBe("failed");
    expect(
      (
        await generateConstructVisual(
          user.id,
          { ...request, requestId: crypto.randomUUID() },
          {
            generate: async (): Promise<GeneratedImage> => ({
              bytes: new Uint8Array([1]),
              mediaType: "image/png",
              costMicroUsd: 0,
            }),
          },
        )
      ).status,
    ).toBe("failed");
    expect(
      (
        await generateConstructVisual(user.id, {
          ...request,
          requestId: crypto.randomUUID(),
        })
      ).status,
    ).toBe("unavailable");
    expect(
      (await getOwnConstruct(user.id, construct.id))?.definition.visual,
    ).toEqual(first.visual);
    expect(await goldSpent(user)).toBe(COST + IMAGE_RESERVATION_MICRO_USD * 2);
  });
  test("reservations serialize concurrent calls across constructs", async () => {
    const { user, provider, request } = await setup();
    await spendGold(user, IMAGE_RESERVATION_MICRO_USD * INITIAL_RESERVATIONS);
    const another = await createConstruct(user.id, {
      name: "Other",
      definition: DEFINITION,
    });
    const event = Promise.withResolvers<GeneratedImage>();
    const started = Promise.withResolvers<void>();
    const delayed: ImageProvider = {
      generate: () => {
        started.resolve();
        return event.promise;
      },
    };
    const first = generateConstructVisual(user.id, request, delayed);
    await started.promise;
    expect(
      (
        await generateConstructVisual(
          user.id,
          {
            ...request,
            constructId: another.id,
            requestId: crypto.randomUUID(),
          },
          provider,
        )
      ).status,
    ).toBe("outOfGold");
    event.resolve(await image());
    expect((await first).status).toBe("generated");
  });
  test("clones, quest snapshots and bought copies retain grants after source deletion", async () => {
    const { user, construct, provider, request } = await setup();
    const [member, outsider, buyer] = await Promise.all([
      testUser(),
      testUser(),
      testUser(),
    ]);
    const generated = await generateConstructVisual(user.id, request, provider);
    const id = assetId(generated);
    const saved = await getOwnConstruct(user.id, construct.id);
    const clone = await cloneConstruct(user.id, construct.id);
    if (saved === undefined || clone === undefined) {
      throw new Error("No construct");
    }
    const project = await testData(user).project();
    await formerMembership(user, member, project.id);
    const chat = await createChat(user.id, {
      project,
      construct: {
        id: DEFAULT_CONSTRUCT_ID,
        name: saved.name,
        definition: saved.definition,
      },
    });
    const listing = await publishListing(
      user.id,
      { kind: "construct", promptId: construct.id },
      { description: "Owl art", price: 0 },
    );
    if (listing.kind !== "published") {
      throw new Error("Not published");
    }
    expect(
      await getVisualAsset(buyer.id, { kind: "listing", id: listing.id }, id),
    ).toBeDefined();
    await getDb()
      .update(marketplaceCutover)
      .set({ enabled: true })
      .where(eq(marketplaceCutover.id, 1));
    const bought = await buyListing(buyer.id, {
      currency: "orbs",
      listingId: listing.id,
      price: 0,
    });
    if (bought.kind !== "bought") {
      throw new Error("Not bought");
    }
    await unlistListing(user.id, listing.id);
    expect(
      await getVisualAsset(buyer.id, { kind: "listing", id: listing.id }, id),
    ).toBeUndefined();
    await retireDefinition(user.id, "construct", construct.id);
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
      await getVisualAsset(
        buyer.id,
        { kind: "construct", id: bought.copy.id },
        id,
      ),
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
  test("forged references roll back writes; listing updates preserve immutable snapshots", async () => {
    const { user, construct, provider, request } = await setup();
    const outsider = await testUser();
    const generated = await generateConstructVisual(user.id, request, provider);
    await expect(
      createConstruct(outsider.id, {
        name: "Stolen",
        definition: { prompt: "x", visual: generated.visual },
      }),
    ).rejects.toMatchObject({ errorCase: "not-found" });
    const listing = await publishListing(
      user.id,
      { kind: "construct", promptId: construct.id },
      { description: "Owl", price: 0 },
    );
    if (listing.kind !== "published") {
      throw new Error("Not published");
    }
    const replacement = await generateConstructVisual(
      user.id,
      { ...request, requestId: crypto.randomUUID() },
      provider,
    );
    expect(
      await getVisualAsset(
        outsider.id,
        { kind: "listing", id: listing.id },
        assetId(generated),
      ),
    ).toBeDefined();
    expect(
      await getVisualAsset(
        outsider.id,
        { kind: "listing", id: listing.id },
        assetId(replacement),
      ),
    ).toBeUndefined();
    await updateListing(user.id, listing.id, {
      description: "Updated",
      price: 0,
    });
    expect(
      await getVisualAsset(
        outsider.id,
        { kind: "listing", id: listing.id },
        assetId(replacement),
      ),
    ).toBeDefined();
    expect(
      await getVisualAsset(
        outsider.id,
        { kind: "listing", id: listing.id },
        assetId(generated),
      ),
    ).toBeUndefined();
  });
  test("partial metadata saves preserve live-build matching while generation sends only the exact description", async () => {
    const user = await testUser();
    const builtIn = getConstruct("lumen");
    const copy = await cloneConstruct(user.id, "lumen");
    if (copy === undefined) {
      throw new Error("No copy");
    }
    expect(
      await editConstructMetadata(user.id, copy.id, {
        prompt: builtIn.definition.prompt,
      }),
    ).toMatchObject({ kind: "saved" });
    const saved = await getOwnConstruct(user.id, copy.id);
    expect(saved?.definition).toEqual(builtIn.definition);
    expect(
      saved?.definition && matchingBuiltInConstruct(saved.definition)?.id,
    ).toBe("lumen");
    const [row] = await getDb()
      .select()
      .from(ownPrompts)
      .where(eq(ownPrompts.id, copy.id));
    expect(row?.parts).toMatchObject({
      voice: earlierConstructText(builtIn.definition).prompt,
    });
    const referenceProvider = { generate: vi.fn(image) };
    const generated = await generateConstructVisual(
      user.id,
      {
        constructId: copy.id,
        requestId: crypto.randomUUID(),
        description: builtIn.definition.visual?.description ?? "",
      },
      referenceProvider,
    );
    expect(generated.status).toBe("generated");
    const [call] = referenceProvider.generate.mock.calls;
    expect(call).toEqual([builtIn.definition.visual?.description]);
    await editConstructMetadata(user.id, copy.id, { name: "Lumen 2" });
    expect(
      (await getOwnConstruct(user.id, copy.id))?.definition.visual,
    ).toEqual(generated.visual);
  });
  test("collection removes bytes only after the final destination grant is released", async () => {
    const { user, construct, provider, request } = await setup();
    const first = await generateConstructVisual(user.id, request, provider);
    const clone = await cloneConstruct(user.id, construct.id);
    if (clone === undefined) {
      throw new Error("No clone");
    }
    await generateConstructVisual(
      user.id,
      { ...request, requestId: crypto.randomUUID() },
      provider,
    );
    expect(
      await getVisualAsset(
        user.id,
        { kind: "construct", id: clone.id },
        assetId(first),
      ),
    ).toBeDefined();
    await retireDefinition(user.id, "construct", clone.id);
    await deleteConstruct(user.id, clone.id);
    // The source retains one previous generation for recovery. Replacing
    // again releases that final grant while retaining the more recent art.
    await generateConstructVisual(
      user.id,
      { ...request, requestId: crypto.randomUUID() },
      provider,
    );
    expect(
      await getDb()
        .select({ id: constructAssets.id })
        .from(constructAssets)
        .where(eq(constructAssets.id, assetId(first))),
    ).toEqual([]);
  });
  test("concurrent edits of sibling copies retain grants without locking each other", async () => {
    const { user, construct, provider, request } = await setup();
    const generated = await generateConstructVisual(user.id, request, provider);
    const clone = await cloneConstruct(user.id, construct.id);
    if (clone === undefined || generated.visual === undefined) {
      throw new Error("No clone");
    }
    const edits = await Promise.all([
      updateConstruct(user.id, construct.id, {
        definition: { prompt: "First voice", visual: generated.visual },
      }),
      updateConstruct(user.id, clone.id, {
        definition: { prompt: "Second voice", visual: generated.visual },
      }),
    ]);
    expect(edits.map((edit) => edit?.definition.prompt)).toEqual([
      "First voice",
      "Second voice",
    ]);
    expect(
      await getVisualAsset(
        user.id,
        { kind: "construct", id: clone.id },
        assetId(generated),
      ),
    ).toBeDefined();
  });
});

test("text edits during generation are preserved and do not stale a valid description-only result", async () => {
  const { user, construct, request } = await setup();
  const response = Promise.withResolvers<GeneratedImage>();
  const started = Promise.withResolvers<void>();
  const generate = vi.fn<ImageProvider["generate"]>(() => {
    started.resolve();
    return response.promise;
  });
  const pending = generateConstructVisual(user.id, request, { generate });
  await started.promise;
  await editConstructMetadata(user.id, construct.id, {
    name: "A new private name",
    prompt: "A new private voice",
    visualDescription: DESCRIPTION,
  });
  expect(
    await readVisualGeneration(user.id, construct.id, request.requestId),
  ).toMatchObject({
    pendingRequestId: request.requestId,
    result: { status: "pending" },
  });
  response.resolve(await image());
  const generated = await pending;
  expect(generated.status).toBe("generated");
  expect(generate.mock.calls).toEqual([[DESCRIPTION]]);
  expect(await getOwnConstruct(user.id, construct.id)).toMatchObject({
    name: "A new private name",
    definition: { prompt: "A new private voice", visual: generated.visual },
  });
  expect(await readVisualGeneration(user.id, construct.id)).toMatchObject({
    outdated: false,
    freshnessUnknown: false,
  });
  await editConstructMetadata(user.id, construct.id, {
    prompt: "Another voice",
    name: "Another name",
  });
  expect(await readVisualGeneration(user.id, construct.id)).toMatchObject({
    outdated: false,
  });
  expect(await generateConstructVisual(user.id, request, { generate })).toEqual(
    generated,
  );
  expect(generate).toHaveBeenCalledTimes(1);
  expect(await goldSpent(user)).toBe(COST);
  await editConstructMetadata(user.id, construct.id, {
    visualDescription: "A blue fox",
  });
  expect(await readVisualGeneration(user.id, construct.id)).toMatchObject({
    outdated: true,
  });
});

test.each(["retire", "delete"] as const)(
  "%s during pending generation rejects attachment and settles the paid result once",
  async (change) => {
    const { user, construct, request } = await setup();
    const response = Promise.withResolvers<GeneratedImage>();
    const started = Promise.withResolvers<void>();
    const generate = vi.fn<ImageProvider["generate"]>(() => {
      started.resolve();
      return response.promise;
    });
    const pending = generateConstructVisual(user.id, request, { generate });
    await started.promise;
    await retireDefinition(user.id, "construct", construct.id);
    if (change === "delete") {
      await deleteConstruct(user.id, construct.id);
    }
    response.resolve(await image());
    expect((await pending).status).toBe("stale");
    expect(await readVisualGeneration(user.id, construct.id)).toBeUndefined();
    expect(await goldSpent(user)).toBe(COST);
    expect(generate).toHaveBeenCalledTimes(1);
  },
);

test("legacy hashes use owned generation descriptions; copied legacy art with no owned record reports unknown freshness without rewriting history", async () => {
  const { user, construct, request, provider } = await setup();
  const generated = await generateConstructVisual(user.id, request, provider);
  if (generated.visual === undefined) {
    throw new Error("No generated visual");
  }
  const legacy = {
    ...generated.visual,
    sourceFingerprintVersion: undefined,
    sourceFingerprint: "a".repeat(LEGACY_DIGEST_LENGTH),
  };
  await updateConstruct(user.id, construct.id, {
    definition: { prompt: "Different voice", visual: legacy },
  });
  const before = await getOwnConstruct(user.id, construct.id);
  expect(await readVisualGeneration(user.id, construct.id)).toMatchObject({
    outdated: false,
    freshnessUnknown: false,
  });
  expect(await getOwnConstruct(user.id, construct.id)).toEqual(before);
  expect(await goldSpent(user)).toBe(COST);
  const buyer = await testUser();
  const listing = await publishListing(
    user.id,
    { kind: "construct", promptId: construct.id },
    { description: "Legacy owl", price: 0 },
  );
  if (listing.kind !== "published") {
    throw new Error("No listing");
  }
  await getDb()
    .update(marketplaceCutover)
    .set({ enabled: true })
    .where(eq(marketplaceCutover.id, 1));
  const bought = await buyListing(buyer.id, {
    currency: "orbs",
    listingId: listing.id,
    price: 0,
  });
  if (bought.kind !== "bought") {
    throw new Error("No bought copy");
  }
  await editConstructMetadata(buyer.id, bought.copy.id, {
    prompt: "Buyer's new voice",
  });
  expect(await readVisualGeneration(buyer.id, bought.copy.id)).toMatchObject({
    outdated: false,
    freshnessUnknown: true,
  });
  await editConstructMetadata(user.id, construct.id, {
    visualDescription: "Different appearance",
  });
  expect(await readVisualGeneration(user.id, construct.id)).toMatchObject({
    outdated: true,
    freshnessUnknown: false,
  });
  expect(provider.generate).toHaveBeenCalledTimes(1);
});

test("replaced artwork can be restored once with its matching description and no charge", async () => {
  const { user, construct, provider, request } = await setup();
  const first = await generateConstructVisual(user.id, request, provider);
  const project = await testData(user).project();
  const snapshot = await createChat(user.id, {
    project,
    construct: {
      id: DEFAULT_CONSTRUCT_ID,
      name: construct.name,
      definition: { ...construct.definition, visual: first.visual },
    },
  });
  await editConstructMetadata(user.id, construct.id, {
    visualDescription: "A silver owl.",
    prompt: "Speak briefly.",
  });
  const second = await generateConstructVisual(
    user.id,
    {
      ...request,
      requestId: crypto.randomUUID(),
      description: "A silver owl.",
    },
    provider,
  );
  const outsider = await testUser();
  expect(await restoreConstructVisual(outsider.id, construct.id)).toBe(false);
  const before = await goldSpent(user);
  expect((await readVisualGeneration(user.id, construct.id))?.canRestore).toBe(
    true,
  );
  expect(await restoreConstructVisual(user.id, construct.id)).toBe(true);
  expect(await restoreConstructVisual(user.id, construct.id)).toBe(false);
  expect(await goldSpent(user)).toBe(before);
  expect(provider.generate).toHaveBeenCalledTimes(2);
  const restored = await getOwnConstruct(user.id, construct.id);
  expect(restored?.definition.visual).toEqual(first.visual);
  expect(restored?.definition.prompt).toBe("Speak briefly.");
  expect((await readVisualGeneration(user.id, construct.id))?.outdated).toBe(
    false,
  );
  expect(
    await getVisualAsset(
      user.id,
      { kind: "construct", id: construct.id },
      assetId(first),
    ),
  ).toBeDefined();
  expect(
    await getVisualAsset(
      user.id,
      { kind: "construct", id: construct.id },
      assetId(second),
    ),
  ).toBeUndefined();
  expect(
    await getVisualAsset(
      user.id,
      { kind: "adventure", id: snapshot.id },
      assetId(first),
    ),
  ).toBeDefined();
});

test("a recovery entry whose bytes were released by an older build is unavailable", async () => {
  const { user, construct, provider, request } = await setup();
  const first = await generateConstructVisual(user.id, request, provider);
  const second = await generateConstructVisual(
    user.id,
    { ...request, requestId: crypto.randomUUID() },
    provider,
  );
  await getDb()
    .delete(constructAssetGrants)
    .where(
      and(
        eq(constructAssetGrants.constructId, construct.id),
        eq(constructAssetGrants.assetId, assetId(first)),
      ),
    );
  expect((await readVisualGeneration(user.id, construct.id))?.canRestore).toBe(
    false,
  );
  expect(await restoreConstructVisual(user.id, construct.id)).toBe(false);
  expect(
    (await getOwnConstruct(user.id, construct.id))?.definition.visual,
  ).toEqual(second.visual);
});

test("recovery on a bought copy restores its original image identity without changing seller or listing snapshots", async () => {
  const { user, construct, provider, request } = await setup();
  const first = await generateConstructVisual(user.id, request, provider);
  const listing = await publishListing(
    user.id,
    { kind: "construct", promptId: construct.id },
    { description: "Owl art", price: 0 },
  );
  if (listing.kind !== "published") {
    throw new Error("No listing");
  }
  const buyer = await testUser();
  await getDb()
    .update(marketplaceCutover)
    .set({ enabled: true })
    .where(eq(marketplaceCutover.id, 1));
  const bought = await buyListing(buyer.id, {
    currency: "orbs",
    listingId: listing.id,
    price: 0,
  });
  if (bought.kind !== "bought") {
    throw new Error("No bought copy");
  }
  await editConstructMetadata(buyer.id, bought.copy.id, {
    visualDescription: "A silver owl.",
  });
  await generateConstructVisual(
    buyer.id,
    {
      constructId: bought.copy.id,
      requestId: crypto.randomUUID(),
      description: "A silver owl.",
    },
    provider,
  );
  expect(await restoreConstructVisual(buyer.id, bought.copy.id)).toBe(true);
  expect(
    (await getOwnConstruct(buyer.id, bought.copy.id))?.definition.visual,
  ).toEqual(first.visual);
  expect(
    (await getOwnConstruct(user.id, construct.id))?.definition.visual,
  ).toEqual(first.visual);
  expect(
    await getVisualAsset(
      buyer.id,
      { kind: "listing", id: listing.id },
      assetId(first),
    ),
  ).toBeDefined();
});

test("draft artwork preserves saved text and replays the paid request once", async () => {
  const { user, construct, request, provider } = await setup();
  const draft = { ...request, description: "An unsaved silver owl." };
  const generated = await generateConstructVisual(user.id, draft, provider);
  expect(generated.status).toBe("generated");
  expect(provider.generate.mock.calls).toEqual([[draft.description]]);
  expect(await getOwnConstruct(user.id, construct.id)).toMatchObject({
    name: construct.name,
    definition: {
      prompt: construct.definition.prompt,
      visual: { description: DESCRIPTION },
    },
  });
  expect(await generateConstructVisual(user.id, draft, provider)).toEqual(
    generated,
  );
  expect(provider.generate).toHaveBeenCalledTimes(1);
  expect(await goldSpent(user)).toBe(COST);
  expect(await readVisualGeneration(user.id, construct.id)).toMatchObject({
    outdated: false,
    artworkDescription: draft.description,
    draftVisual: generated.visual,
  });
});

test("first draft artwork does not persist a description or conversational edits", async () => {
  const { user, provider } = await setup();
  const construct = await createConstruct(user.id, {
    name: "No appearance",
    definition: { prompt: "Saved instructions" },
  });
  const request = {
    constructId: construct.id,
    requestId: crypto.randomUUID(),
    description: "A draft paper bird",
  };
  const generated = await generateConstructVisual(user.id, request, provider);
  expect(generated.status).toBe("generated");
  expect(generated.visual?.description).toBe(request.description);
  const [record] = await getDb()
    .select()
    .from(constructGenerations)
    .where(
      and(
        eq(constructGenerations.userId, user.id),
        eq(constructGenerations.requestId, request.requestId),
      ),
    );
  // The previous build drops the whole optional visual if this required text is empty.
  const oldVisual = z
    .object({
      version: z.literal(1),
      description: z.string().trim().min(1),
      canonical: z.object({ kind: z.literal("generated"), assetId: z.uuid() }),
    })
    .optional()
    .catch(undefined);
  expect(oldVisual.parse(record?.visual)).toMatchObject({
    description: request.description,
    canonical: generated.visual?.canonical,
  });
  expect(
    await getVisualAsset(
      user.id,
      { kind: "construct", id: construct.id },
      assetId(generated),
    ),
  ).toBeDefined();
  await editConstructMetadata(user.id, construct.id, {
    prompt: "Text after discard",
    visualDescription: "",
  });
  expect(await getOwnConstruct(user.id, construct.id)).toMatchObject({
    name: "No appearance",
    definition: {
      prompt: "Text after discard",
      visual: undefined,
    },
  });
});

test("saving generated draft artwork attaches it without another paid call", async () => {
  const { user, construct, request, provider } = await setup();
  const draft = { ...request, description: "A silver draft owl" };
  const generated = await generateConstructVisual(user.id, draft, provider);
  expect(generated.visual?.description).toBe(draft.description);
  expect(
    await getVisualAsset(
      user.id,
      { kind: "construct", id: construct.id },
      assetId(generated),
    ),
  ).toBeDefined();
  expect(await readVisualGeneration(user.id, construct.id)).toMatchObject({
    draftVisual: generated.visual,
  });
  await editConstructMetadata(user.id, construct.id, {
    visualDescription: draft.description,
  });
  expect(
    await generateConstructVisual(
      user.id,
      { ...draft, requestId: crypto.randomUUID() },
      provider,
      { saved: true, regenerate: false },
    ),
  ).toMatchObject({ status: "generated", visual: generated.visual });
  expect(
    (await getOwnConstruct(user.id, construct.id))?.definition.visual,
  ).toEqual(generated.visual);
  expect(provider.generate).toHaveBeenCalledTimes(1);
  expect(await goldSpent(user)).toBe(COST);
});
test("a saved submission superseded before claim reserves no gold", async () => {
  const { user, construct, request, provider } = await setup();
  await editConstructMetadata(user.id, construct.id, {
    visualDescription: "Other tab",
  });
  expect(
    await generateConstructVisual(user.id, request, provider, {
      saved: true,
      regenerate: false,
    }),
  ).toMatchObject({ status: "stale" });
  expect(provider.generate).not.toHaveBeenCalled();
  expect(await goldSpent(user)).toBe(0);
});
test("a saved appearance changed while draft generation runs keeps prior art and bills once", async () => {
  const { user, construct, request, provider } = await setup();
  const prior = await generateConstructVisual(user.id, request, provider);
  const started = Promise.withResolvers<void>();
  const response = Promise.withResolvers<GeneratedImage>();
  const generate = vi.fn<ImageProvider["generate"]>(() => {
    started.resolve();
    return response.promise;
  });
  const draft = {
    ...request,
    requestId: crypto.randomUUID(),
    description: "Draft B",
  };
  const pending = generateConstructVisual(user.id, draft, { generate });
  await started.promise;
  await editConstructMetadata(user.id, construct.id, {
    visualDescription: "Saved C",
  });
  response.resolve(await image());
  expect((await pending).status).toBe("stale");
  expect(
    (await getOwnConstruct(user.id, construct.id))?.definition.visual,
  ).toEqual({ ...prior.visual, description: "Saved C" });
  expect(generate.mock.calls).toEqual([["Draft B"]]);
  expect(await goldSpent(user)).toBe(COST * 2);
});

test("saved draft artwork restores its source description and releases detached previews", async () => {
  const { user, construct, request, provider } = await setup();
  const first = await generateConstructVisual(user.id, request, provider);
  const draft = {
    ...request,
    requestId: crypto.randomUUID(),
    description: "Draft silver owl",
  };
  const second = await generateConstructVisual(user.id, draft, provider);
  const outsider = await testUser();
  expect(
    await getVisualAsset(
      outsider.id,
      { kind: "construct", id: construct.id },
      assetId(second),
    ),
  ).toBeUndefined();
  const clone = await cloneConstruct(user.id, construct.id);
  expect(clone?.definition.visual).toEqual(first.visual);
  await editConstructMetadata(user.id, construct.id, {
    visualDescription: draft.description,
  });
  expect(await restoreConstructVisual(user.id, construct.id)).toBe(true);
  expect(
    (await getOwnConstruct(user.id, construct.id))?.definition.visual,
  ).toEqual(first.visual);
  expect(
    (await readVisualGeneration(user.id, construct.id))?.draftVisual,
  ).toBeUndefined();
  expect(
    await getVisualAsset(
      user.id,
      { kind: "construct", id: construct.id },
      assetId(second),
    ),
  ).toBeUndefined();
  expect(await goldSpent(user)).toBe(COST * 2);
});
