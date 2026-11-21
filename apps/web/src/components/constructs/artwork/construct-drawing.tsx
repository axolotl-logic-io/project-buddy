import type { JSX } from "react";
import type { DrawingProps } from "@/components/constructs/artwork/frame-view-box.ts";
import {
  LumenAvatar,
  LumenPortrait,
} from "@/components/constructs/artwork/lumen.tsx";
import {
  VellumAvatar,
  VellumPortrait,
} from "@/components/constructs/artwork/vellum.tsx";
import type {
  Artwork,
  VisualAsset,
  VisualFrame,
  VisualRole,
} from "@/constructs/visual.ts";

type Drawing = (props: DrawingProps) => JSX.Element;

interface Cuts {
  // Drawn for 32 and 40 px: the face, heavier and simpler.
  readonly avatar: Drawing;
  // The whole drawing, for every other role.
  readonly portrait: Drawing;
}

const DRAWINGS: Readonly<Record<Artwork, Cuts>> = {
  lumen: { avatar: LumenAvatar, portrait: LumenPortrait },
  vellum: { avatar: VellumAvatar, portrait: VellumPortrait },
};

// The inline drawing of a built-in asset in a role, framed as the role's
// frame says, or undefined without an asset.
function constructDrawing(
  asset: VisualAsset | undefined,
  role: VisualRole,
  frame: VisualFrame,
): JSX.Element | undefined {
  if (asset === undefined) {
    return undefined;
  }
  const { [asset.artwork]: cuts } = DRAWINGS;
  let Drawing = cuts.portrait;
  if (role === "avatar") {
    Drawing = cuts.avatar;
  }
  return <Drawing frame={frame} />;
}

export { constructDrawing };
