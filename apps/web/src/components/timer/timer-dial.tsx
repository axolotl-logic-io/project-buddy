import { type JSX, useId } from "react";
import { TIMER_COPY } from "@/ui/copy/timer.ts";

const MARKER_COUNT = 12;
const FULL_TURN = 360;
const MARKERS: readonly number[] = Array.from(
  { length: MARKER_COUNT },
  (_, index) => index,
);

// The seal's two squares, each cut off at the inner guide circle.
const SEAL_DIAMOND = "M210 54 366 210 210 366 54 210Z";
const SEAL_SQUARE = "M118 118h184v184H118Z";
// The shapes over each layer, back to front.
const OVER_DIAMOND: readonly string[] = [SEAL_SQUARE];
const OVER_FRONT: readonly string[] = [];

// What a layer's mask leaves out: the writing, which every line keeps clear
// of, and the seal's shapes laid over the layer.
function LayerMask({
  id,
  knockoutId,
  over,
}: {
  readonly id: string;
  readonly knockoutId: string;
  readonly over: readonly string[];
}): JSX.Element {
  return (
    <mask
      id={id}
      maskUnits="userSpaceOnUse"
      x="0"
      y="0"
      width="420"
      height="420"
    >
      <rect fill="white" width="420" height="420" />
      {over.map((shape) => (
        <path className="timer-seal" d={shape} fill="black" key={shape} />
      ))}
      <use href={`#${knockoutId}`} />
    </mask>
  );
}

// All ornament is live markup. The site's tokens choose a motif, and each
// marker becomes filled and brighter once the schedule's arc has passed it.
// The seal's squares are stacked like cut paper inside the inner guide
// circle, which cuts them off: the diamond at the back, then the square,
// hiding the diamond's lines behind it. No line runs through the writing.
function TimerDial({
  elapsedFraction,
}: {
  readonly elapsedFraction: number;
}): JSX.Element {
  const topId = useId();
  const bottomId = useId();
  const knockoutId = useId();
  const sealClipId = useId();
  const diamondMaskId = useId();
  const frontMaskId = useId();
  const inscriptions = (
    <>
      <text className="timer-inscription">
        <textPath href={`#${topId}`} startOffset="50%" textAnchor="middle">
          {TIMER_COPY.dial.inscription}
        </textPath>
      </text>
      <text className="timer-inscription">
        <textPath href={`#${bottomId}`} startOffset="50%" textAnchor="middle">
          {TIMER_COPY.dial.refrain}
        </textPath>
      </text>
    </>
  );
  return (
    <g className="timer-engraving">
      <defs>
        <path id={topId} d="M73 210a137 137 0 0 1 274 0" />
        <path id={bottomId} d="M36 210a174 174 0 0 0 348 0" />
        <g className="timer-dial-labels timer-knockout" id={knockoutId}>
          {inscriptions}
        </g>
        <clipPath id={sealClipId}>
          <circle className="timer-inner-guide" cx="210" cy="210" />
        </clipPath>
        <LayerMask
          id={diamondMaskId}
          knockoutId={knockoutId}
          over={OVER_DIAMOND}
        />
        <LayerMask id={frontMaskId} knockoutId={knockoutId} over={OVER_FRONT} />
      </defs>
      <g className="timer-guide-lines">
        <g mask={`url(#${frontMaskId})`}>
          <circle className="timer-outer-guide" cx="210" cy="210" />
          <circle className="timer-middle-guide" cx="210" cy="210" />
          <circle className="timer-inner-guide" cx="210" cy="210" />
        </g>
        <g clipPath={`url(#${sealClipId})`}>
          <path
            className="timer-seal"
            d={SEAL_DIAMOND}
            mask={`url(#${diamondMaskId})`}
          />
          <path
            className="timer-seal"
            d={SEAL_SQUARE}
            mask={`url(#${frontMaskId})`}
          />
        </g>
      </g>
      <g className="timer-dial-labels">{inscriptions}</g>
      <g mask={`url(#${frontMaskId})`}>
        {MARKERS.map((index) => (
          <g
            className="timer-marker"
            data-passed={index / MARKER_COUNT <= elapsedFraction}
            key={index}
            transform={`rotate(${(index * FULL_TURN) / MARKER_COUNT} 210 210)`}
          >
            <g className="timer-sigil">
              <path className="timer-marker-fill" d="m210 17 5 7-5 7-5-7Z" />
              <path d="M202 24h16M210 16v16" />
            </g>
            <g className="timer-chapter">
              <path d="m198 32 12-12 12 12m-24 0v8m24-8v8M210 46v9" />
              <path className="timer-marker-fill" d="m210 20 4 4-4 4-4-4Z" />
            </g>
          </g>
        ))}
      </g>
    </g>
  );
}

export { TimerDial };
