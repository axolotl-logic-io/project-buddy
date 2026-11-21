import { z } from "zod";
import type { ConstructSnapshot } from "@/constructs/construct.ts";

// Built-in artwork is live SVG that the appearance colours.
const ARTWORK = z.enum(["vellum", "lumen"]);

const VISUAL_ASSET = z.object({
  kind: z.literal("built-in"),
  artwork: ARTWORK,
});
const VISUAL_FRAME = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  size: z.number().positive().max(1),
});
const VISUAL_ROLE = z.enum(["avatar", "portrait", "opening", "working"]);
const DESCRIPTION_MAX = 4000;
const DESCRIPTION_LINE_BREAK = /\r\n?/gu;

function normalizeVisualDescription(description: string): string {
  return description.replace(DESCRIPTION_LINE_BREAK, "\n").trim();
}
const CONSTRUCT_VISUAL = z.object({
  version: z.literal(1),
  description: z.string().trim().min(1).max(DESCRIPTION_MAX),
  canonical: VISUAL_ASSET.optional(),
  working: VISUAL_ASSET.optional(),
  frames: z
    .object({
      avatar: VISUAL_FRAME.optional(),
      portrait: VISUAL_FRAME.optional(),
      opening: VISUAL_FRAME.optional(),
      working: VISUAL_FRAME.optional(),
    })
    .optional(),
});

type VisualAsset = z.infer<typeof VISUAL_ASSET>;
type Artwork = z.infer<typeof ARTWORK>;
type VisualFrame = z.infer<typeof VISUAL_FRAME>;
type VisualRole = z.infer<typeof VISUAL_ROLE>;
type ConstructVisual = z.infer<typeof CONSTRUCT_VISUAL>;

interface ResolvedConstructVisual {
  readonly asset: VisualAsset | undefined;
  readonly frame: VisualFrame;
  readonly initials: string;
  readonly description: string | undefined;
}
const WORD_BREAK = /\s+/u;

// Deliberately accepts no construct id. Legacy own constructs can carry a built-in id.
function resolveConstructVisual(
  construct: ConstructSnapshot,
  role: VisualRole,
): ResolvedConstructVisual {
  const { visual } = construct.definition;
  let asset = visual?.canonical;
  if (role === "working") {
    asset = visual?.working ?? asset;
  }
  const initials = construct.name
    .trim()
    .split(WORD_BREAK)
    .slice(0, 2)
    .map((word) => Array.from(word)[0] ?? "")
    .join("")
    .toLocaleUpperCase();
  return {
    asset,
    frame: visual?.frames?.[role] ?? { x: 0.5, y: 0.5, size: 1 },
    initials: initials || "?",
    description: visual?.description,
  };
}

export type { Artwork, ConstructVisual, VisualAsset, VisualFrame, VisualRole };
export {
  ARTWORK,
  CONSTRUCT_VISUAL,
  normalizeVisualDescription,
  resolveConstructVisual,
  VISUAL_ROLE,
};
