import type { JSX } from "react";
import type { DrawingProps } from "@/components/constructs/artwork/frame-view-box.ts";
import {
  LumenAvatar,
  LumenPortrait,
} from "@/components/constructs/artwork/lumen-v2.tsx";
import {
  VellumAvatar,
  VellumPortrait,
} from "@/components/constructs/artwork/vellum-v2.tsx";
import {
  DRAWN_ARTWORK,
  type DrawnArtwork,
  type VisualAsset,
  type VisualFrame,
  type VisualRole,
} from "@/constructs/visual.ts";

type Drawing = (props: DrawingProps) => JSX.Element;

interface Cuts {
  // Drawn for 32 and 40 px: the face, heavier and simpler.
  readonly avatar: Drawing;
  // The whole drawing, for every other role.
  readonly portrait: Drawing;
}

const DRAWINGS: Readonly<Record<DrawnArtwork, Cuts>> = {
  "lumen-v2": { avatar: LumenAvatar, portrait: LumenPortrait },
  "vellum-v2": { avatar: VellumAvatar, portrait: VellumPortrait },
};

// The inline drawing of a drawn built-in asset in a role, framed as the
// role's frame says, or undefined for any other asset.
function constructDrawing(
  asset: VisualAsset | undefined,
  role: VisualRole,
  frame: VisualFrame,
): JSX.Element | undefined {
  if (asset?.kind !== "built-in") {
    return undefined;
  }
  const drawn = DRAWN_ARTWORK.safeParse(asset.artwork);
  if (!drawn.success) {
    return undefined;
  }
  const { [drawn.data]: cuts } = DRAWINGS;
  let Drawing = cuts.portrait;
  if (role === "avatar") {
    Drawing = cuts.avatar;
  }
  return <Drawing frame={frame} />;
}

export { constructDrawing };
