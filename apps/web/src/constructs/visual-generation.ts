import { and, desc, eq, isNull, sql } from "drizzle-orm";
import sharp from "sharp";
import { z } from "zod";
import {
  constructGenerationOwnedBy,
  constructGenerationVisualOpenTo,
  ownPromptOwnedBy,
} from "@/accounts/owner-scope.ts";
import {
  parseConstructDefinition,
  storedConstructPrompt,
} from "@/constructs/construct-definition.ts";
import { listConstructs } from "@/constructs/index.ts";
import {
  CONSTRUCT_VISUAL,
  type ConstructVisual,
  normalizeVisualDescription,
} from "@/constructs/visual.ts";
import {
  grantVisualAssets,
  latestDraftVisual,
  previousVisualAvailable,
} from "@/constructs/visual-asset-store.ts";
import {
  VISUAL_GENERATION_REQUEST,
  type VisualGenerationQuote,
  type VisualGenerationRequest,
  type VisualGenerationResult,
  type VisualGenerationStatus,
  type VisualRoleState,
} from "@/constructs/visual-generation-contract.ts";
import { getDb, inTransaction, type Transaction } from "@/db/client.ts";
import {
  constructAssetGrants,
  constructAssets,
  constructGenerations,
} from "@/db/tables/construct-visuals.ts";
import { ownPrompts } from "@/db/tables/own-prompts.ts";
import { goldOfMicroUsd } from "@/gold/gold.ts";
import { adjustGold, lockGold, reserveGold } from "@/gold/gold-store.ts";
import type { UserId } from "@/ids.ts";
import { IMAGE_MEDIA_TYPE, MAX_IMAGE_BYTES } from "@/images/image-contract.ts";
import {
  type GeneratedImage,
  IMAGE_RESERVATION_MICRO_USD,
  type ImageProvider,
  imageProvider,
} from "@/images/image-provider.ts";

const HEX_RADIX = 16;
const MAX_PIXELS = 4_194_304;
const RESERVATION_GOLD = goldOfMicroUsd(IMAGE_RESERVATION_MICRO_USD);
const COST = z.number().int().nonnegative();
type GenerationRow = typeof constructGenerations.$inferSelect;
async function visualFingerprint(description: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(normalizeVisualDescription(description)),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(HEX_RADIX).padStart(2, "0"),
  ).join("");
}
function result(
  status: VisualGenerationStatus,
  visual?: ConstructVisual,
): VisualGenerationResult {
  let state: VisualRoleState = "failed";
  if (status === "pending") {
    state = "pending";
  }
  if (status === "generated") {
    state = "generated";
  }
  return {
    status,
    reservationGold: RESERVATION_GOLD,
    roles: { avatar: state, portrait: state, opening: state, working: state },
    visual,
  };
}
function replay(
  row: GenerationRow,
  request: VisualGenerationRequest,
): VisualGenerationResult {
  if (
    row.sourceId !== request.constructId ||
    normalizeVisualDescription(row.description) !==
      normalizeVisualDescription(request.description)
  ) {
    return result("stale");
  }
  const status = z
    .enum(["pending", "generated", "failed", "stale"])
    .parse(row.status);
  return result(status, CONSTRUCT_VISUAL.safeParse(row.visual).data);
}
async function claim(
  owner: UserId,
  request: VisualGenerationRequest,
  available: boolean,
  options: { readonly saved: boolean; readonly regenerate: boolean },
): Promise<VisualGenerationResult | { id: string; description: string }> {
  return await inTransaction(async (tx) => {
    await lockGold(owner, tx);
    const [existing] = await tx
      .select()
      .from(constructGenerations)
      .where(
        and(
          constructGenerationOwnedBy(owner),
          eq(constructGenerations.requestId, request.requestId),
        ),
      );
    if (existing !== undefined) {
      return replay(existing, request);
    }
    const [source] = await tx
      .select({
        id: ownPrompts.id,
        parts: ownPrompts.parts,
        revision: sql<string>`${ownPrompts.updatedAt}::text`,
      })
      .from(ownPrompts)
      .where(
        and(
          ownPromptOwnedBy(owner),
          eq(ownPrompts.id, request.constructId),
          eq(ownPrompts.kind, "buddy"),
          isNull(ownPrompts.retiredAt),
        ),
      )
      .for("share");
    const definition = parseConstructDefinition(source?.parts);
    if (source === undefined || definition === undefined) {
      return result("not-found");
    }
    if (
      options.saved &&
      normalizeVisualDescription(definition.visual?.description ?? "") !==
        request.description
    ) {
      return result("stale");
    }
    if (
      options.saved &&
      !options.regenerate &&
      definition.visual?.sourceFingerprintVersion === 2 &&
      definition.visual.sourceFingerprint ===
        (await visualFingerprint(request.description))
    ) {
      return result("generated", definition.visual);
    }
    const [pending] = await tx
      .select()
      .from(constructGenerations)
      .where(
        and(
          constructGenerationOwnedBy(owner),
          eq(constructGenerations.constructId, request.constructId),
          eq(constructGenerations.status, "pending"),
        ),
      );
    if (pending !== undefined) {
      return result("pending");
    }
    if (!available) {
      return result("unavailable");
    }
    if (!(await reserveGold(owner, IMAGE_RESERVATION_MICRO_USD, tx))) {
      return result("outOfGold");
    }
    const [created] = await tx
      .insert(constructGenerations)
      .values({
        userId: owner,
        constructId: source.id,
        sourceId: source.id,
        requestId: request.requestId,
        description: request.description,
        sourceParts: source.parts,
        sourceUpdatedAt: source.revision,
        costMicroUsd: IMAGE_RESERVATION_MICRO_USD,
      })
      .returning({ id: constructGenerations.id });
    return {
      id: z.uuid().parse(created?.id),
      description: request.description,
    };
  });
}
// Read the immutable generation identity, rather than today's edited description.
async function recoverableVisual(
  owner: UserId,
  tx: Transaction,
  visual: ConstructVisual | undefined,
): Promise<ConstructVisual | null> {
  const canonical = visual?.canonical;
  if (canonical === undefined) {
    return null;
  }
  if (canonical.kind === "built-in") {
    return (
      listConstructs().find((construct) => {
        const asset = construct.definition.visual?.canonical;
        return (
          asset?.kind === "built-in" && asset.artwork === canonical.artwork
        );
      })?.definition.visual ?? null
    );
  }
  const [original] = await tx
    .select({ visual: constructGenerations.visual })
    .from(constructGenerations)
    .where(
      and(
        constructGenerationVisualOpenTo(owner),
        eq(constructGenerations.status, "generated"),
        sql`${constructGenerations.visual}->'canonical'->>'assetId' = ${canonical.assetId}`,
      ),
    )
    .limit(1);
  return CONSTRUCT_VISUAL.safeParse(original?.visual).data ?? visual ?? null;
}

async function complete(
  owner: UserId,
  id: string,
  image: GeneratedImage,
): Promise<VisualGenerationResult> {
  IMAGE_MEDIA_TYPE.parse(image.mediaType);
  if (image.bytes.length === 0 || image.bytes.length > MAX_IMAGE_BYTES) {
    throw new Error("Invalid image size");
  }
  const decoder = sharp(image.bytes, {
    limitInputPixels: MAX_PIXELS,
    failOn: "warning",
  });
  const metadata = await decoder.metadata();
  const format = z.enum(["png", "jpeg", "gif", "webp"]).parse(metadata.format);
  if (image.mediaType !== `image/${format}`) {
    throw new Error("Image media type mismatch");
  }
  if (metadata.width !== metadata.height || (metadata.pages ?? 1) !== 1) {
    throw new Error("Expected one square raster image");
  }
  const bytes = await decoder.webp().toBuffer();
  if (bytes.length > MAX_IMAGE_BYTES) {
    throw new Error("Image too large");
  }
  const cost = COST.parse(image.costMicroUsd);
  return await inTransaction(async (tx) => {
    await lockGold(owner, tx);
    const [generation] = await tx
      .select()
      .from(constructGenerations)
      .where(
        and(
          constructGenerationOwnedBy(owner),
          eq(constructGenerations.id, id),
          eq(constructGenerations.status, "pending"),
        ),
      )
      .for("update");
    if (generation === undefined) {
      return result("failed");
    }
    const [source] = await tx
      .select()
      .from(ownPrompts)
      .where(
        and(
          ownPromptOwnedBy(owner),
          eq(ownPrompts.id, generation.sourceId),
          isNull(ownPrompts.retiredAt),
          eq(ownPrompts.kind, "buddy"),
        ),
      )
      .for("update");
    const definition = parseConstructDefinition(source?.parts);
    let parts = source?.parts;
    let visual: ConstructVisual | undefined;
    let status: "generated" | "stale" = "stale";
    if (
      source !== undefined &&
      definition !== undefined &&
      normalizeVisualDescription(definition.visual?.description ?? "") ===
        normalizeVisualDescription(
          parseConstructDefinition(generation.sourceParts)?.visual
            ?.description ?? "",
        )
    ) {
      const [asset] = await tx
        .insert(constructAssets)
        .values({ mediaType: "image/webp", data: bytes.toString("base64") })
        .returning({ id: constructAssets.id });
      const assetId = z.uuid().parse(asset?.id);
      await tx
        .insert(constructAssetGrants)
        .values({ assetId, constructId: source.id });
      visual = {
        version: 1,
        description: generation.description,
        sourceFingerprint: await visualFingerprint(generation.description),
        sourceFingerprintVersion: 2,
        canonical: { kind: "generated", assetId },
        frames: { avatar: { x: 0.5, y: 0.5, size: 0.5 } },
      };
      // Unsaved artwork has its own compatible snapshot; Save alone changes text.
      if (
        normalizeVisualDescription(definition.visual?.description ?? "") ===
        generation.description
      ) {
        parts = storedConstructPrompt({ ...definition, visual });
        await tx
          .update(ownPrompts)
          .set({
            parts,
            previousVisual: await recoverableVisual(
              owner,
              tx,
              definition.visual,
            ),
            updatedAt: sql`now()`,
          })
          .where(and(ownPromptOwnedBy(owner), eq(ownPrompts.id, source.id)));
      }
      status = "generated";
    }
    await tx
      .update(constructGenerations)
      .set({ status, visual, costMicroUsd: cost })
      .where(
        and(constructGenerationOwnedBy(owner), eq(constructGenerations.id, id)),
      );
    if (status === "generated" && source !== undefined) {
      await grantVisualAssets(
        owner,
        tx,
        { kind: "construct", id: source.id },
        { parts },
      );
    }
    await adjustGold(owner, IMAGE_RESERVATION_MICRO_USD - cost, tx);
    return result(status, visual);
  });
}
async function generateConstructVisual(
  owner: UserId,
  input: VisualGenerationRequest,
  provider: ImageProvider | undefined = imageProvider(),
  options: { readonly saved: boolean; readonly regenerate: boolean } = {
    saved: false,
    regenerate: false,
  },
): Promise<VisualGenerationResult> {
  const request = VISUAL_GENERATION_REQUEST.parse(input);
  const claimed = await claim(owner, request, provider !== undefined, options);
  if ("status" in claimed) {
    return claimed;
  }
  try {
    if (provider === undefined) {
      throw new Error("Provider unavailable");
    }
    return await complete(
      owner,
      claimed.id,
      await provider.generate(claimed.description),
    );
  } catch {
    // An unknown billed failure retains the reservation. No automatic paid retry.
    await getDb()
      .update(constructGenerations)
      .set({ status: "failed" })
      .where(
        and(
          constructGenerationOwnedBy(owner),
          eq(constructGenerations.id, claimed.id),
          eq(constructGenerations.status, "pending"),
        ),
      );
    return result("failed");
  }
}
async function readVisualGeneration(
  owner: UserId,
  constructId: string,
  requestId?: string,
): Promise<VisualGenerationQuote | undefined> {
  if (
    !z.uuid().safeParse(constructId).success ||
    (requestId !== undefined && !z.uuid().safeParse(requestId).success)
  ) {
    return undefined;
  }
  const [source] = await getDb()
    .select()
    .from(ownPrompts)
    .where(
      and(
        ownPromptOwnedBy(owner),
        eq(ownPrompts.id, constructId),
        eq(ownPrompts.kind, "buddy"),
        isNull(ownPrompts.retiredAt),
      ),
    );
  const definition = parseConstructDefinition(source?.parts);
  if (source === undefined || definition === undefined) {
    return undefined;
  }
  const predicates = [
    constructGenerationOwnedBy(owner),
    eq(constructGenerations.sourceId, constructId),
  ];
  if (requestId === undefined) {
    predicates.push(eq(constructGenerations.status, "pending"));
  } else {
    predicates.push(
      eq(constructGenerations.requestId, z.uuid().parse(requestId)),
    );
  }
  const [generation] = await getDb()
    .select()
    .from(constructGenerations)
    .where(and(...predicates))
    .orderBy(desc(constructGenerations.createdAt))
    .limit(1);
  const draftVisual = await latestDraftVisual(owner, constructId, definition);
  const visual = draftVisual ?? definition.visual;
  let artworkDescription: string | undefined;
  let outdated = false;
  let freshnessUnknown = false;
  if (visual?.canonical?.kind === "generated") {
    const [original] = await getDb()
      .select({ description: constructGenerations.description })
      .from(constructGenerations)
      .where(
        and(
          constructGenerationVisualOpenTo(owner),
          eq(constructGenerations.status, "generated"),
          sql`${constructGenerations.visual}->'canonical'->>'assetId' = ${visual.canonical.assetId}`,
        ),
      )
      .limit(1);
    artworkDescription = original?.description;

    if (visual.sourceFingerprintVersion === 2) {
      outdated =
        visual.sourceFingerprint !==
        (await visualFingerprint(visual.description));
    } else {
      // Old hashes included conversational text. Use an owned immutable
      // generation record's description when available, never today's voice.
      const [legacyOriginal] = await getDb()
        .select({ description: constructGenerations.description })
        .from(constructGenerations)
        .where(
          and(
            constructGenerationOwnedBy(owner),
            eq(constructGenerations.status, "generated"),
            sql`${constructGenerations.visual}->'canonical'->>'assetId' = ${visual.canonical.assetId}`,
          ),
        )
        .limit(1);
      if (legacyOriginal === undefined) {
        freshnessUnknown = true;
      } else {
        outdated =
          normalizeVisualDescription(legacyOriginal.description) !==
          normalizeVisualDescription(visual.description);
      }
    }
  }
  const quote: VisualGenerationQuote = {
    artworkDescription,
    draftVisual,
    reservationGold: RESERVATION_GOLD,
    available: imageProvider() !== undefined,
    outdated,
    freshnessUnknown,
    canRestore: await previousVisualAvailable(
      owner,
      constructId,
      source.previousVisual,
    ),
  };
  if (generation === undefined && requestId !== undefined) {
    quote.result = result("not-found");
  }
  if (generation !== undefined) {
    quote.result = replay(generation, {
      constructId,
      requestId: generation.requestId,
      description: generation.description,
    });
    if (generation.status === "pending") {
      quote.pendingRequestId = generation.requestId;
      quote.pendingDescription = generation.description;
    }
  }
  return quote;
}

export { generateConstructVisual, readVisualGeneration, visualFingerprint };
