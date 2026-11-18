import { z } from "zod";
import type { ConstructSnapshot } from "@/constructs/construct.ts";

// Built-in raster artwork is a committed reference PNG with WebP derivatives.
// Snapshots taken before the drawings keep pointing at it.
const RASTER_ARTWORK = z.enum(["vellum-v1", "lumen-v1"]);
// Built-in drawn artwork is live SVG that the appearance colours.
const DRAWN_ARTWORK = z.enum(["vellum-v2", "lumen-v2"]);

// References are immutable identities, never provider URLs, storage keys or owner ids.
const VISUAL_ASSET = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("built-in"),
    artwork: z.enum([...RASTER_ARTWORK.options, ...DRAWN_ARTWORK.options]),
  }),
  z.object({ kind: z.literal("generated"), assetId: z.uuid() }),
]);
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
const FINGERPRINT_PATTERN = /^[a-f0-9]{64}$/u;
const CONSTRUCT_VISUAL = z.object({
  version: z.literal(1),
  description: z.string().trim().min(1).max(DESCRIPTION_MAX),
  sourceFingerprint: z.string().regex(FINGERPRINT_PATTERN).optional(),
  sourceFingerprintVersion: z.literal(2).optional(),
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

const VISUAL_DESTINATION = z.object({
  kind: z.enum(["construct", "adventure"]),
  id: z.uuid(),
});
type VisualDestination = z.infer<typeof VISUAL_DESTINATION>;

type VisualAsset = z.infer<typeof VISUAL_ASSET>;
type DrawnArtwork = z.infer<typeof DRAWN_ARTWORK>;
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

// The image file an asset loads from. Drawn built-ins render inline and have
// no file, so they resolve to undefined, as do generated references without
// a valid destination.
function constructVisualSource(
  asset: VisualAsset | undefined,
  destination?: VisualDestination,
): string | undefined {
  if (asset?.kind === "built-in") {
    const raster = RASTER_ARTWORK.safeParse(asset.artwork);
    if (raster.success) {
      return `/constructs/${raster.data}.png`;
    }
    return undefined;
  }
  if (
    asset?.kind === "generated" &&
    destination !== undefined &&
    VISUAL_DESTINATION.safeParse(destination).success
  ) {
    return `/api/constructs/visuals/${destination.kind}/${destination.id}/${asset.assetId}`;
  }
  return undefined;
}

export type {
  ConstructVisual,
  DrawnArtwork,
  VisualAsset,
  VisualDestination,
  VisualFrame,
  VisualRole,
};
export {
  CONSTRUCT_VISUAL,
  constructVisualSource,
  DRAWN_ARTWORK,
  normalizeVisualDescription,
  resolveConstructVisual,
  VISUAL_DESTINATION,
  VISUAL_ROLE,
};
