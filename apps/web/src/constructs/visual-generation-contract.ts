import { z } from "zod";
import type { ConstructVisual } from "@/constructs/visual.ts";

const VISUAL_GENERATION_REQUEST = z.object({
  constructId: z.uuid(),
  requestId: z.uuid(),
  description: z.string().min(1).max(4000),
}).strict();
type VisualGenerationRequest = z.infer<typeof VISUAL_GENERATION_REQUEST>;
type VisualGenerationStatus = "generated" | "pending" | "failed" | "unavailable" | "outOfGold" | "not-found" | "stale";
type VisualRoleState = "pending" | "generated" | "failed";
interface VisualGenerationResult {
  readonly status: VisualGenerationStatus;
  readonly reservationGold: number;
  readonly roles: Readonly<Record<"avatar" | "portrait" | "opening" | "working", VisualRoleState>>;
  readonly visual?: ConstructVisual;
}
export type { VisualGenerationRequest, VisualGenerationResult, VisualGenerationStatus, VisualRoleState };
export { VISUAL_GENERATION_REQUEST };
