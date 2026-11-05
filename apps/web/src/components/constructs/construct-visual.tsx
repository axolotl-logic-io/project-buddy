"use client";

import Image from "next/image";
import type { CSSProperties, JSX, SyntheticEvent } from "react";
import type {
  ConstructAvatarProps,
  ConstructIllustrationProps,
} from "@/components/constructs/construct-visual-props.ts";
import {
  constructVisualSource,
  resolveConstructVisual,
} from "@/constructs/visual.ts";

const PERCENT = 100;
const CENTER = 50;

function hideFailedImage(event: SyntheticEvent<HTMLImageElement>): void {
  event.currentTarget.hidden = true;
}

function ConstructIllustration({
  construct,
  visualRole,
  decorative,
}: ConstructIllustrationProps): JSX.Element {
  const visual = resolveConstructVisual(construct, visualRole);
  const src = constructVisualSource(visual.asset);
  let label: string | undefined = construct.name;
  if (decorative === true) {
    label = undefined;
  }
  let image: JSX.Element | undefined;
  if (src !== undefined) {
    const { x, y, size } = visual.frame;
    const style: CSSProperties = {
      width: `${PERCENT / size}%`,
      maxWidth: "none",
      height: `${PERCENT / size}%`,
      left: `${CENTER - (x * PERCENT) / size}%`,
      top: `${CENTER - (y * PERCENT) / size}%`,
    };
    image = (
      <Image
        alt=""
        src={src}
        width={1024}
        height={1024}
        style={style}
        unoptimized={true}
        key={src}
        onError={hideFailedImage}
      />
    );
  }
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
