// The built-in artwork each built-in construct ships with, read from its own
// definition, so the tests follow new or replaced artwork (vellum-v2, a new
// construct) without listing file names.
import {
  type ConstructId,
  getConstruct,
  listConstructs,
} from "@/constructs/index.ts";
import { VISUAL_WIDTHS } from "@/constructs/visual-delivery.ts";

// The built-in artwork a construct's canonical visual names, such as
// "vellum-v1"; throws if it names none.
function builtInArtwork(id: ConstructId): string {
  const canonical = getConstruct(id).definition.visual?.canonical;
  if (canonical?.kind !== "built-in") {
    throw new Error(`The ${id} construct has no built-in artwork`);
  }
  return canonical.artwork;
}

// Every built-in construct's built-in artwork.
function builtInArtworks(): readonly string[] {
  return [
    ...new Set(
      listConstructs().flatMap((construct) => {
        const canonical = construct.definition.visual?.canonical;
        if (canonical?.kind !== "built-in") {
          return [];
        }
        return [canonical.artwork];
      }),
    ),
  ];
}

// The paths the site serves `artwork` at: one WebP per advertised width.
function builtInArtworkPaths(artwork: string): readonly string[] {
  return VISUAL_WIDTHS.map((width) => `/constructs/${artwork}-${width}.webp`);
}

export { builtInArtwork, builtInArtworkPaths, builtInArtworks };
