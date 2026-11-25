import type { JSX } from "react";

// The shapes a page's skeleton is built from, top to bottom: a line of text,
// a list of cards, or a panel such as a form. The trail band shows the page
// heading while the page loads.
type SkeletonShape = "line" | "cards" | "panel";

// Each shape's blocks, by their size; no two blocks of a shape are the same
// size.
const SHAPE_BLOCKS: Readonly<Record<SkeletonShape, readonly string[]>> = {
  line: ["h-5 w-1/3"],
  cards: ["h-14", "h-14 w-11/12", "h-14 w-5/6"],
  panel: ["h-44 rounded-box"],
};

// What a page shows while its content streams in: the shapes, each at most
// once, where the content will be, and the label, such as "Loading
// quests…", for screen readers. Its region is busy (aria-busy) for as long
// as it shows, which is how a test knows the page is still loading. The
// shapes pulse unless the user asks for less motion.
function LoadingSkeleton({
  label,
  shapes,
}: {
  readonly label: string;
  readonly shapes: readonly SkeletonShape[];
}): JSX.Element {
  return (
    <div aria-busy="true" className="flex flex-col gap-4" role="status">
      <span className="sr-only">{label}</span>
      <LoadingShapes shapes={shapes} />
    </div>
  );
}

// Decorative shapes for a page that already supplies its own busy status.
function LoadingShapes({
  shapes,
}: {
  readonly shapes: readonly SkeletonShape[];
}): JSX.Element {
  return (
    <>
      {shapes.map((shape) => (
        <div aria-hidden="true" className="flex flex-col gap-3" key={shape}>
          {SHAPE_BLOCKS[shape].map((block) => (
            <div className={`skeleton ${block}`} key={block} />
          ))}
        </div>
      ))}
    </>
  );
}

export { LoadingShapes, LoadingSkeleton };
