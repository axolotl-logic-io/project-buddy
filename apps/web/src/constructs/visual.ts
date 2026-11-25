import { z } from "zod";
import type { Construct } from "@/constructs/construct.ts";

// Built-in artwork is live SVG that the appearance colours.
type Artwork = "vellum" | "lumen";

interface VisualAsset {
  readonly kind: "built-in";
  readonly artwork: Artwork;
}

interface VisualFrame {
  readonly x: number;
  readonly y: number;
  readonly size: number;
}

const VISUAL_ROLE = z.enum(["avatar", "portrait", "opening", "working"]);
type VisualRole = z.infer<typeof VISUAL_ROLE>;

interface ConstructVisual {
  readonly version: 1;
  readonly description: string;
  readonly canonical?: VisualAsset | undefined;
  readonly working?: VisualAsset | undefined;
  readonly frames?:
    | Readonly<Partial<Record<VisualRole, VisualFrame | undefined>>>
    | undefined;
}

interface ResolvedConstructVisual {
  readonly asset: VisualAsset | undefined;
  readonly frame: VisualFrame;
  readonly initials: string;
  readonly description: string | undefined;
}
const WORD_BREAK = /\s+/u;

function resolveConstructVisual(
  construct: Construct,
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
export { resolveConstructVisual, VISUAL_ROLE };
