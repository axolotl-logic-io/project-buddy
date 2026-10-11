import type { JSX } from "react";

// The shapes a page's skeleton is built from, top to bottom: a heading, a
// line of text, a list of cards, a panel (such as a form), or a chat's
// messages.
type SkeletonShape = "heading" | "line" | "cards" | "panel" | "messages";

// Each shape's blocks, by their size; no two blocks of a shape are the same
// size.
const SHAPE_BLOCKS: Readonly<Record<SkeletonShape, readonly string[]>> = {
  heading: ["h-9 w-2/3"],
  line: ["h-5 w-1/3"],
  cards: ["h-14", "h-14 w-11/12", "h-14 w-5/6"],
  panel: ["h-44 rounded-box"],
  messages: ["h-16 w-4/5", "h-24 w-11/12 self-end", "h-16 w-3/4"],
};

// What a page shows while its content streams in: the shapes, each at most
// once, where the content will be, and the label, such as "Loading
// projects…", for screen readers. The shapes pulse unless the user asks for
// less motion.
export function LoadingSkeleton({
  label,
  shapes,
}: {
  readonly label: string;
  readonly shapes: readonly SkeletonShape[];
}): JSX.Element {
  return (
    <div className="flex flex-col gap-4" role="status">
      <span className="sr-only">{label}</span>
      {shapes.map((shape) => (
        <div aria-hidden="true" className="flex flex-col gap-3" key={shape}>
          {SHAPE_BLOCKS[shape].map((block) => (
            <div className={`skeleton ${block}`} key={block} />
          ))}
        </div>
      ))}
    </div>
  );
}
