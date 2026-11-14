import { and, eq } from "drizzle-orm";
import sharp from "sharp";
import { z } from "zod";
import { getDb } from "@/db/client.ts";
import {
  constructAssetGrants,
  constructAssets,
} from "@/db/tables/construct-visuals.ts";
import { imageGenerations } from "@/db/tables/image-generations.ts";
import { ownPrompts } from "@/db/tables/own-prompts.ts";
import type { ChatId, UserId } from "@/ids.ts";
import {
  GENERATION_ID,
  type GenerationId,
} from "@/images/generation-contract.ts";
import { saveImage } from "@/images/store.ts";
import { pngBytes } from "../images/image-fixtures.ts";

const ARTWORK_SIZE = 256;

// What image generation left behind before it was turned off, which the
// site still serves to its owners.

// Generated artwork on one of owner's constructs, as image generation stored
// it before it was turned off: the asset's bytes, the construct's grant to
// them, and the construct's visual naming them as its canonical art. Returns
// the asset's id.
async function seedGeneratedArtwork(
  owner: UserId,
  constructId: string,
): Promise<string> {
  const bytes = await sharp({
    create: {
      width: ARTWORK_SIZE,
      height: ARTWORK_SIZE,
      channels: 3,
      background: "white",
    },
  })
    .png()
    .toBuffer();
  const [asset] = await getDb()
    .insert(constructAssets)
    .values({ mediaType: "image/png", data: bytes.toString("base64") })
    .returning({ id: constructAssets.id });
  if (asset === undefined) {
    throw new Error("No artwork asset");
  }
  await getDb()
    .insert(constructAssetGrants)
    .values({ assetId: asset.id, constructId });
  const [row] = await getDb()
    .select({ parts: ownPrompts.parts })
    .from(ownPrompts)
    .where(and(eq(ownPrompts.userId, owner), eq(ownPrompts.id, constructId)));
  const parts = z
    .object({ visual: z.record(z.string(), z.unknown()).optional() })
    .loose()
    .parse(row?.parts);
  await getDb()
    .update(ownPrompts)
    .set({
      parts: {
        ...parts,
        visual: {
          version: 1,
          ...parts.visual,
          canonical: { kind: "generated", assetId: asset.id },
        },
      },
    })
    .where(and(eq(ownPrompts.userId, owner), eq(ownPrompts.id, constructId)));
  return asset.id;
}

// A generated image in one of owner's chats, as image generation stored it
// before it was turned off: the image's bytes and the generation that names
// them.
async function seedGeneratedImage(
  owner: UserId,
  chatId: ChatId,
): Promise<GenerationId> {
  const url = await saveImage(owner, chatId, pngBytes(), "image/png");
  if (url === undefined) {
    throw new Error("The image was not saved");
  }
  const [generation] = await getDb()
    .insert(imageGenerations)
    .values({
      userId: owner,
      chatId,
      requestId: crypto.randomUUID(),
      prompt: "A sea turtle",
      imageUrl: url,
      status: "generated",
      costMicroUsd: 0,
    })
    .returning({ id: imageGenerations.id });
  return GENERATION_ID.parse(generation?.id);
}

export { seedGeneratedArtwork, seedGeneratedImage };
