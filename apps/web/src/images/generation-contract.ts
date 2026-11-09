import { z } from "zod";

const MAX_GENERATION_PROMPT_LENGTH = 1000;
const GALLERY_PAGE_SIZE = 40;
const GENERATE_IMAGE_TOOL = "generate_image";
const GENERATE_IMAGE_INPUT = z.object({
  prompt: z.string().trim().min(1).max(MAX_GENERATION_PROMPT_LENGTH),
});
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
type GenerateImageInput = z.infer<typeof GENERATE_IMAGE_INPUT>;
type GenerateImageOutput = z.infer<typeof GENERATE_IMAGE_OUTPUT>;

const GENERATE_IMAGE_DESCRIPTION =
  "Generate at most one image per user message, only when the user asks you to create an image. Describe the requested image in the prompt (at most 1000 characters). The result is displayed automatically and saved in the user's gallery. Do not repeat a failed or pending request automatically. Each image reserves batteries before generation. An outOfGold result means the image reservation could not be covered, not necessarily a zero balance. Use requiredGold and availableGold as the amounts at the time of this request when provided. Replies still spend batteries even if image generation is refused; never offer further replies as free. Do not claim an image was generated unless the tool succeeds.";

function generatedImageUrl(id: GenerationId, download = false): string {
  if (download) {
    return `/api/generated-images/${id}?download=1`;
  }
  return `/api/generated-images/${id}`;
}

export type { GenerateImageInput, GenerateImageOutput, GenerationId };
export {
  GALLERY_PAGE_SIZE,
  GENERATE_IMAGE_DESCRIPTION,
  GENERATE_IMAGE_INPUT,
  GENERATE_IMAGE_OUTPUT,
  GENERATE_IMAGE_TOOL,
  GENERATION_ID,
  generatedImageUrl,
};
