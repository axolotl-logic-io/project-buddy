import { z } from "zod";
import {
  CONSTRUCT_VISUAL,
  normalizeVisualDescription,
} from "@/constructs/visual.ts";

const DESCRIPTION_MAX = 4000;
const VISUAL_GENERATION_REQUEST = z
  .object({
    constructId: z.uuid(),
    requestId: z.uuid(),
    description: z
      .string()
      .transform(normalizeVisualDescription)
      .pipe(z.string().min(1).max(DESCRIPTION_MAX)),
  })
  .strict();
const VISUAL_GENERATION_STATUS = z.enum([
  "generated",
  "pending",
  "failed",
  "unavailable",
  "outOfGold",
  "not-found",
  "stale",
]);
const VISUAL_ROLE_STATE = z.enum(["pending", "generated", "failed"]);
const VISUAL_GENERATION_RESULT = z.object({
  status: VISUAL_GENERATION_STATUS,
  reservationGold: z.number().nonnegative(),
  roles: z.object({
    avatar: VISUAL_ROLE_STATE,
    portrait: VISUAL_ROLE_STATE,
    opening: VISUAL_ROLE_STATE,
    working: VISUAL_ROLE_STATE,
  }),
  visual: CONSTRUCT_VISUAL.optional(),
});
const VISUAL_GENERATION_QUOTE = z.object({
  reservationGold: z.number().nonnegative(),
  available: z.boolean(),
  outdated: z.boolean(),
  freshnessUnknown: z.boolean().optional(),
  pendingRequestId: z.uuid().optional(),
  pendingDescription: z.string().optional(),
  result: VISUAL_GENERATION_RESULT.optional(),
});
type VisualGenerationRequest = z.infer<typeof VISUAL_GENERATION_REQUEST>;
type VisualGenerationResult = z.infer<typeof VISUAL_GENERATION_RESULT>;
type VisualGenerationQuote = z.infer<typeof VISUAL_GENERATION_QUOTE>;
type VisualGenerationStatus = z.infer<typeof VISUAL_GENERATION_STATUS>;
type VisualRoleState = z.infer<typeof VISUAL_ROLE_STATE>;

export type {
  VisualGenerationQuote,
  VisualGenerationRequest,
  VisualGenerationResult,
  VisualGenerationStatus,
  VisualRoleState,
};
export {
  VISUAL_GENERATION_QUOTE,
  VISUAL_GENERATION_REQUEST,
  VISUAL_GENERATION_RESULT,
  VISUAL_GENERATION_STATUS,
  VISUAL_ROLE_STATE,
};
