import { and, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import { z } from "zod";
import {
  chatOwnedBy,
  generationOwnedBy,
  monthlySpendOwnedBy,
} from "@/accounts/owner-scope.ts";
import { getDb, openPool } from "@/db/client.ts";
import { imageGenerations } from "@/db/tables/image-generations.ts";
import { monthlySpend } from "@/db/tables/monthly-spend.ts";
import { chats } from "@/db/tables/projects-and-chats.ts";
import { readDatabaseUrl } from "@/env.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
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
import { MONTHLY_QUOTA_MICRO_USD, spendMonthOf } from "@/quota/quota-terms.ts";

const GENERATION_ROW = z.object({
  id: GENERATION_ID,
  chatId: CHAT_ID,
  prompt: z.string(),
  imageUrl: z.string().nullable(),
  status: z.enum(["pending", "generated", "failed"]),
  createdAt: z.date(),
});
type GalleryImage = z.infer<typeof GENERATION_ROW>;

// Serializes claims on the owner's month, including concurrent requests
// in different chats. Both the durable claim and reservation commit before
// any provider call. Replays return the existing outcome, without charging.
async function claimGeneration(
  request: GenerationRequest,
): Promise<GenerationClaim> {
  return await withAppErrors("claim image generation", async () => {
    const pool = openPool(readDatabaseUrl());
    try {
      return await drizzle(pool).transaction(
        async (tx): Promise<GenerationClaim> => {
          const month = spendMonthOf(new Date());
          await tx
            .insert(monthlySpend)
            .values({ userId: request.owner, month, microUsd: 0 })
            .onConflictDoNothing();
          const [usage] = await tx
            .select()
            .from(monthlySpend)
            .where(
              and(
                monthlySpendOwnedBy(request.owner),
                eq(monthlySpend.month, month),
              ),
            )
            .for("update");
          const [chat] = await tx
            .select({ id: chats.id })
            .from(chats)
            .where(
              and(chatOwnedBy(request.owner), eq(chats.id, request.chatId)),
            )
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
          if (
            usage === undefined ||
            usage.microUsd + IMAGE_RESERVATION_MICRO_USD >
              MONTHLY_QUOTA_MICRO_USD
          ) {
            return { status: "quotaUsedUp" };
          }
          await tx
            .update(monthlySpend)
            .set({
              microUsd: sql`${monthlySpend.microUsd} + ${IMAGE_RESERVATION_MICRO_USD}`,
            })
            .where(
              and(
                monthlySpendOwnedBy(request.owner),
                eq(monthlySpend.month, month),
              ),
            );
          const [created] = await tx
            .insert(imageGenerations)
            .values({
              userId: request.owner,
              chatId: request.chatId,
              requestId: request.requestId,
              prompt: request.prompt,
              month,
              costMicroUsd: IMAGE_RESERVATION_MICRO_USD,
            })
            .returning({ id: imageGenerations.id });
          return { status: "claimed", id: GENERATION_ID.parse(created?.id) };
        },
      );
    } finally {
      await pool.end();
    }
  });
}

async function completeGeneration(
  owner: UserId,
  id: GenerationId,
  image: GeneratedImage,
): Promise<boolean> {
  const [generation] = await withAppErrors("read generation to complete", () =>
    getDb()
      .select({
        chatId: imageGenerations.chatId,
        month: imageGenerations.month,
      })
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
  return await withAppErrors("complete image generation", async () => {
    const pool = openPool(readDatabaseUrl());
    try {
      return await drizzle(pool).transaction(async (tx): Promise<boolean> => {
        // Match claim's lock order so a concurrent chat deletion cannot
        // form a cycle through its generation rows and monthly spend.
        await tx
          .select({ userId: monthlySpend.userId })
          .from(monthlySpend)
          .where(
            and(
              monthlySpendOwnedBy(owner),
              eq(monthlySpend.month, generation.month),
            ),
          )
          .for("update");
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
          .returning({ month: imageGenerations.month });
        if (settled === undefined) {
          return false;
        }
        await tx
          .update(monthlySpend)
          .set({
            microUsd: sql`${monthlySpend.microUsd} + ${image.costMicroUsd - IMAGE_RESERVATION_MICRO_USD}`,
          })
          .where(
            and(
              monthlySpendOwnedBy(owner),
              eq(monthlySpend.month, settled.month),
            ),
          );
        return true;
      });
    } finally {
      await pool.end();
    }
  });
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
  const predicates = [generationOwnedBy(owner)];
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
        and(generationOwnedBy(owner), eq(imageGenerations.id, parsed.data)),
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
