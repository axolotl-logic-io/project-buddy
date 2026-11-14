import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { generationOpenTo } from "@/accounts/owner-scope.ts";
import { getDb } from "@/db/client.ts";
import { imageGenerations } from "@/db/tables/image-generations.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import { CHAT_ID, type UserId } from "@/ids.ts";
import { GENERATION_ID } from "@/images/generation-contract.ts";

const GENERATION_ROW = z.object({
  id: GENERATION_ID,
  chatId: CHAT_ID,
  prompt: z.string(),
  imageUrl: z.string().nullable(),
  status: z.enum(["pending", "generated", "failed"]),
  createdAt: z.date(),
});
type GeneratedImageRow = z.infer<typeof GENERATION_ROW>;

async function getGeneratedImage(
  owner: UserId,
  id: string,
): Promise<GeneratedImageRow | undefined> {
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

export { getGeneratedImage };
