import { z } from "zod";
import { PROMPT_KINDS } from "@/prompts/prompt.ts";

const WORKSHOP_LIMITS = {
  text: 20_000,
  reply: 30_000,
  history: 40,
  message: 10_000,
  whenToUse: 300,
} as const;
const WORKSHOP_DRAFT = z.object({
  kind: z.enum(PROMPT_KINDS),
  id: z.string().min(1),
  name: z.string().trim().min(1).max(WORKSHOP_LIMITS.text),
  prompt: z.string().max(WORKSHOP_LIMITS.text),
  whenToUse: z.string().max(WORKSHOP_LIMITS.whenToUse),
  openingRequest: z.string().max(WORKSHOP_LIMITS.text),
});
const WORKSHOP_MESSAGE = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(WORKSHOP_LIMITS.reply),
});
const WORKSHOP_REQUEST = z
  .object({
    draft: WORKSHOP_DRAFT,
    buddyId: z.string().min(1),
    activityId: z.string().min(1),
    forceCast: z.boolean(),
    opening: z.boolean(),
    history: z.array(WORKSHOP_MESSAGE).max(WORKSHOP_LIMITS.history),
    castIds: z.array(z.string().min(1)).max(WORKSHOP_LIMITS.history),
    message: z.string().max(WORKSHOP_LIMITS.message),
  })
  .refine((request) => request.opening || request.message.trim().length > 0);
const WORKSHOP_RESULT = z.object({
  text: z.string(),
  openingText: z.string().optional(),
  casts: z.array(z.object({ id: z.string(), name: z.string() })),
});
interface WorkshopChoice {
  readonly id: string;
  readonly name: string;
}
interface WorkshopOptions {
  readonly buddies: readonly WorkshopChoice[];
  readonly activities: readonly WorkshopChoice[];
}
type WorkshopDraft = z.infer<typeof WORKSHOP_DRAFT>;
type WorkshopRequest = z.infer<typeof WORKSHOP_REQUEST>;
type WorkshopMessage = z.infer<typeof WORKSHOP_MESSAGE>;
type WorkshopResult = z.infer<typeof WORKSHOP_RESULT>;

export type {
  WorkshopChoice,
  WorkshopDraft,
  WorkshopMessage,
  WorkshopOptions,
  WorkshopRequest,
  WorkshopResult,
};
export { WORKSHOP_DRAFT, WORKSHOP_LIMITS, WORKSHOP_REQUEST, WORKSHOP_RESULT };
