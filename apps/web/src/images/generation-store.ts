import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import {
  chatOpenTo,
  generationOpenTo,
  generationOwnedBy,
} from "@/accounts/owner-scope.ts";
import { getDb, inTransaction } from "@/db/client.ts";
import { imageGenerations } from "@/db/tables/image-generations.ts";
import { chats } from "@/db/tables/projects-and-chats.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import { goldOfMicroUsd, wholeGold } from "@/gold/gold.ts";
import {
  adjustGold,
  lockGold,
  readGoldBalance,
  reserveGold,
} from "@/gold/gold-store.ts";
import { CHAT_ID, type UserId } from "@/ids.ts";
import type { GenerationClaim, GenerationRequest } from "@/images/generate.ts";
import {
  GALLERY_PAGE_SIZE,
  GENERATION_ID,
  type GenerationId,
} from "@/images/generation-contract.ts";
import {
  type GeneratedImage,
  IMAGE_RESERVATION_MICRO_USD,
} from "@/images/image-provider.ts";
import { saveImage } from "@/images/store.ts";

const GENERATION_ROW = z.object({
  id: GENERATION_ID,
  chatId: CHAT_ID,
  prompt: z.string(),
  imageUrl: z.string().nullable(),
  status: z.enum(["pending", "generated", "failed"]),
  createdAt: z.date(),
});
type GalleryImage = z.infer<typeof GENERATION_ROW>;

// Serializes claims on the owner's gold, including concurrent requests in
// different chats. Both the durable claim and the gold it reserves commit
// before any provider call. Replays return the existing outcome, without
// charging.
async function claimGeneration(
  request: GenerationRequest,
): Promise<GenerationClaim> {
  return await withAppErrors("claim image generation", () =>
    inTransaction(async (tx): Promise<GenerationClaim> => {
      await lockGold(request.owner, tx);
      const [chat] = await tx
        .select({ id: chats.id })
        .from(chats)
        .where(and(chatOpenTo(request.owner), eq(chats.id, request.chatId)))
        .for("share");
      if (chat === undefined) {
        return { status: "failed" };
      }
      const [existing] = await tx
        .select()
        .from(imageGenerations)
        .where(
          and(
            generationOwnedBy(request.owner),
            eq(imageGenerations.requestId, request.requestId),
          ),
        );
      if (existing !== undefined) {
        const row = GENERATION_ROW.parse(existing);
        if (row.status === "generated") {
          return { status: "generated", id: row.id, prompt: row.prompt };
        }
        return { status: row.status };
      }
      const available = await readGoldBalance(request.owner, tx);
      if (
        !(await reserveGold(request.owner, IMAGE_RESERVATION_MICRO_USD, tx))
      ) {
        return {
          status: "outOfGold",
          requiredGold: goldOfMicroUsd(IMAGE_RESERVATION_MICRO_USD),
          availableGold: wholeGold(available),
        };
      }
      const [created] = await tx
        .insert(imageGenerations)
        .values({
          userId: request.owner,
          chatId: request.chatId,
          requestId: request.requestId,
          prompt: request.prompt,
          costMicroUsd: IMAGE_RESERVATION_MICRO_USD,
        })
        .returning({ id: imageGenerations.id });
      return { status: "claimed", id: GENERATION_ID.parse(created?.id) };
    }),
  );
}

async function completeGeneration(
  owner: UserId,
  id: GenerationId,
  image: GeneratedImage,
): Promise<boolean> {
  const [generation] = await withAppErrors("read generation to complete", () =>
    getDb()
      .select({ chatId: imageGenerations.chatId })
      .from(imageGenerations)
      .where(
        and(
          generationOwnedBy(owner),
          eq(imageGenerations.id, id),
          eq(imageGenerations.status, "pending"),
        ),
      ),
  );
  if (generation === undefined) {
    return false;
  }
  const url = await saveImage(
    owner,
    CHAT_ID.parse(generation.chatId),
    image.bytes,
    image.mediaType,
  );
  if (url === undefined) {
    return false;
  }
  return await withAppErrors("complete image generation", () =>
    inTransaction(async (tx): Promise<boolean> => {
      // Match claim's lock order so a concurrent chat deletion cannot
      // form a cycle through its generation rows and the owner's gold.
      await lockGold(owner, tx);
      const [settled] = await tx
        .update(imageGenerations)
        .set({
          status: "generated",
          imageUrl: url,
          costMicroUsd: image.costMicroUsd,
        })
        .where(
          and(
            generationOwnedBy(owner),
            eq(imageGenerations.id, id),
            eq(imageGenerations.status, "pending"),
          ),
        )
        .returning({ id: imageGenerations.id });
      if (settled === undefined) {
        return false;
      }
      await adjustGold(
        owner,
        IMAGE_RESERVATION_MICRO_USD - image.costMicroUsd,
        tx,
      );
      return true;
    }),
  );
}

async function failGeneration(owner: UserId, id: GenerationId): Promise<void> {
  await withAppErrors("fail image generation", () =>
    getDb()
      .update(imageGenerations)
      .set({ status: "failed" })
      .where(
        and(
          generationOwnedBy(owner),
          eq(imageGenerations.id, id),
          eq(imageGenerations.status, "pending"),
        ),
      ),
  );
}

async function listGeneratedImages(
  owner: UserId,
  before?: { readonly createdAt: Date; readonly id: GenerationId },
): Promise<GalleryImage[]> {
  // Only owner's generations in chats still open to them: none from a team
  // project they have left.
  const predicates = [generationOwnedBy(owner), generationOpenTo(owner)];
  if (before !== undefined) {
    predicates.push(
      sql`(${imageGenerations.createdAt}, ${imageGenerations.id}) < (${before.createdAt}, ${before.id}::uuid)`,
    );
  }
  const rows = await withAppErrors("list generated images", () =>
    getDb()
      .select()
      .from(imageGenerations)
      .where(and(...predicates))
      .orderBy(desc(imageGenerations.createdAt), desc(imageGenerations.id))
      .limit(GALLERY_PAGE_SIZE),
  );
  return rows.map((row) => GENERATION_ROW.parse(row));
}

async function getGeneratedImage(
  owner: UserId,
  id: string,
): Promise<GalleryImage | undefined> {
  const parsed = GENERATION_ID.safeParse(id);
  if (!parsed.success) {
    return undefined;
  }
  const [row] = await withAppErrors("get generated image", () =>
    getDb()
      .select()
      .from(imageGenerations)
      .where(
        and(generationOpenTo(owner), eq(imageGenerations.id, parsed.data)),
      ),
  );
  if (row === undefined) {
    return undefined;
  }
  return GENERATION_ROW.parse(row);
}

export type { GalleryImage };
export {
  claimGeneration,
  completeGeneration,
  failGeneration,
  getGeneratedImage,
  listGeneratedImages,
};
