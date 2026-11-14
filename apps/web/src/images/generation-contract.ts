import { z } from "zod";

const GENERATE_IMAGE_TOOL = "generate_image";
const GENERATION_ID = z.uuid().brand<"GenerationId">();
const GENERATE_IMAGE_OUTPUT = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("generated"),
    id: GENERATION_ID,
    prompt: z.string(),
  }),
  z.object({
    status: z.literal("outOfGold"),
    requiredGold: z.number().positive().optional(),
    availableGold: z.number().int().nonnegative().optional(),
  }),
  z.object({
    // quotaUsedUp is how chats saved before gold say there was too little
    // left, as outOfGold says now.
    status: z.enum(["quotaUsedUp", "unavailable", "failed", "pending"]),
  }),
]);
type GenerationId = z.infer<typeof GENERATION_ID>;

function generatedImageUrl(id: GenerationId, download = false): string {
  if (download) {
    return `/api/generated-images/${id}?download=1`;
  }
  return `/api/generated-images/${id}`;
}

export type { GenerationId };
export {
  GENERATE_IMAGE_OUTPUT,
  GENERATE_IMAGE_TOOL,
  GENERATION_ID,
  generatedImageUrl,
};
