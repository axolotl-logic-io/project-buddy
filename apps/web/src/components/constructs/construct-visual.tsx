"use client";

import type { JSX } from "react";
import { constructDrawing } from "@/components/constructs/artwork/construct-drawing.tsx";
import type {
  ConstructAvatarProps,
  ConstructIllustrationProps,
} from "@/components/constructs/construct-visual-props.ts";
import { resolveConstructVisual } from "@/constructs/visual.ts";

function ConstructIllustration({
  construct,
  visualRole,
  decorative,
}: ConstructIllustrationProps): JSX.Element {
  const visual = resolveConstructVisual(construct, visualRole);
  let label: string | undefined = construct.name;
  if (decorative === true) {
    label = undefined;
  }
  const image = constructDrawing(visual.asset, visualRole, visual.frame);
  return (
    <span
      className="construct-visual"
      data-visual-role={visualRole}
      role="img"
      aria-label={label}
      aria-hidden={decorative}
    >
      <span aria-hidden={true}>{visual.initials}</span>
      {image}
    </span>
  );
}

function ConstructAvatar({
  construct,
  size = 40,
  decorative,
}: ConstructAvatarProps): JSX.Element {
  return (
    <span className="construct-avatar" data-avatar-size={size}>
      <ConstructIllustration
        construct={construct}
        visualRole="avatar"
        decorative={decorative}
      />
    </span>
  );
}

export { ConstructAvatar, ConstructIllustration };
