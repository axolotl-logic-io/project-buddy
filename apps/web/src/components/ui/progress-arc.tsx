import type { JSX } from "react";

// What the arc's dashes are measured against, whatever its radius, so CSS
// may set the radius.
const ARC_LENGTH = 100;

// A ring of progress, for use inside an svg: a track circle, `.progress-track`,
// and over it an arc, `.progress-arc`, that fills clockwise from the top as
// fraction goes from 0 to 1. The caller's CSS paints both, and may set their
// radius and stroke width over the ones given here; paint, such as a
// pattern's url, paints the arc where CSS can't.
function ProgressArc({
  centre,
  fraction,
  paint,
  radius,
  strokeWidth,
}: {
  readonly centre: number;
  readonly fraction: number;
  readonly paint?: string;
  readonly radius: number;
  readonly strokeWidth?: number;
}): JSX.Element {
  return (
    <>
      <circle
        className="progress-track"
        cx={centre}
        cy={centre}
        r={radius}
        strokeWidth={strokeWidth}
        pathLength={ARC_LENGTH}
      />
      <circle
        className="progress-arc"
        stroke={paint}
        cx={centre}
        cy={centre}
        r={radius}
        strokeWidth={strokeWidth}
        pathLength={ARC_LENGTH}
        strokeDasharray={ARC_LENGTH}
        strokeDashoffset={ARC_LENGTH * (1 - fraction)}
        transform={`rotate(-90 ${centre} ${centre})`}
      />
    </>
  );
}

export { ProgressArc };
