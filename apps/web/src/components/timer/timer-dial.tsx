import { type JSX, useId } from "react";
import { TIMER_COPY } from "@/ui/copy/timer.ts";

const MARKER_COUNT = 12;
const FULL_TURN = 360;
const MARKERS: readonly number[] = Array.from(
  { length: MARKER_COUNT },
  (_, index) => index,
);

// All ornament is live markup. The site's tokens choose a motif, and each
// marker becomes filled and brighter once the schedule's arc has passed it.
function TimerDial({
  elapsedFraction,
}: {
  readonly elapsedFraction: number;
}): JSX.Element {
  const topId = useId();
  const bottomId = useId();
  return (
    <g className="timer-engraving">
      <defs>
        <path id={topId} d="M68 210a142 142 0 0 1 284 0" />
        <path id={bottomId} d="M29 210a181 181 0 0 0 362 0" />
      </defs>
      <g className="timer-guide-lines">
        <circle className="timer-outer-guide" cx="210" cy="210" />
        <circle className="timer-middle-guide" cx="210" cy="210" />
        <circle className="timer-inner-guide" cx="210" cy="210" />
        <path
          className="timer-seal"
          d="M210 40 380 210 210 380 40 210ZM112 112h28m140 0h28v196H112V112"
        />
      </g>
      <g className="timer-dial-labels">
        <text className="timer-roman" x="210" y="14" textAnchor="middle">
          {TIMER_COPY.dial.north}
        </text>
        <text className="timer-roman" x="409" y="214" textAnchor="middle">
          {TIMER_COPY.dial.east}
        </text>
        <text className="timer-roman" x="210" y="418" textAnchor="middle">
          {TIMER_COPY.dial.south}
        </text>
        <text className="timer-roman" x="12" y="214" textAnchor="middle">
          {TIMER_COPY.dial.west}
        </text>
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
      </g>
      {MARKERS.map((index) => (
        <g
          className="timer-marker"
          data-passed={index / MARKER_COUNT <= elapsedFraction}
          key={index}
          transform={`rotate(${(index * FULL_TURN) / MARKER_COUNT} 210 210)`}
        >
          <path className="timer-tick" d="M210 22v15" />
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
  );
}

export { TimerDial };
