import { type JSX, useId } from "react";

// The sand follows the current period, including after a sleeping tab returns.
// Both bowls reset together when the schedule begins its next period.
function TimerHourglass({
  elapsedFraction,
}: {
  readonly elapsedFraction: number;
}): JSX.Element {
  const topId = useId();
  const bottomId = useId();
  const grainId = useId();
  const topDepth = 142;
  const bottomDepth = 137;
  const topEdge = 55;
  const bottomEdge = 347;
  const bottomLevel = bottomEdge - bottomDepth * elapsedFraction;
  return (
    <svg aria-hidden="true" className="timer-hourglass" viewBox="0 0 230 400">
      <defs>
        <clipPath id={topId}>
          <path d="M48 55H182C182 111 164 150 115 197 66 150 48 111 48 55Z" />
        </clipPath>
        <clipPath id={bottomId}>
          <path d="M115 210C66 256 48 292 48 347H182C182 292 164 256 115 210Z" />
        </clipPath>
        <pattern
          id={grainId}
          width="7"
          height="7"
          patternUnits="userSpaceOnUse"
        >
          <rect className="timer-sand" width="7" height="7" />
          <path className="timer-sand-grain" d="M1 2h1m2 3h1" />
        </pattern>
      </defs>
      <path
        className="timer-hourglass-wood"
        d="M27 28h176v8H27ZM27 365h176v8H27Z"
      />
      <path
        className="timer-hourglass-frame"
        d="M37 42h156M37 357h156M33 46v303M197 46v303M40 49h150M40 351h150"
      />
      <path
        className="timer-hourglass-glass"
        d="M48 55C48 117 68 155 109 197V210C68 252 48 287 48 347M182 55C182 117 162 155 121 197V210C162 252 182 287 182 347"
      />
      <rect
        data-sand-top=""
        x="48"
        y={topEdge + topDepth * elapsedFraction}
        width="134"
        height={topDepth * (1 - elapsedFraction)}
        fill={`url(#${grainId})`}
        clipPath={`url(#${topId})`}
      />
      <rect
        data-sand-bottom=""
        x="48"
        y={bottomLevel}
        width="134"
        height={bottomDepth * elapsedFraction}
        fill={`url(#${grainId})`}
        clipPath={`url(#${bottomId})`}
      />
      {elapsedFraction > 0 && elapsedFraction < 1 && (
        <path className="timer-sand-stream" d={`M115 203V${bottomLevel}`} />
      )}
      <path
        className="timer-sand"
        d="m32 17 4 6-4 6-4-6Zm166 0 4 6-4 6-4-6ZM32 373l4 6-4 6-4-6Zm166 0 4 6-4 6-4-6Z"
      />
    </svg>
  );
}

export { TimerHourglass };
