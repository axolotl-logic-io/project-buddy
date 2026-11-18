import type { VisualFrame } from "@/constructs/visual.ts";

// A drawing's square board, in its own user units.
interface DrawingBox {
  readonly x: number;
  readonly y: number;
  readonly size: number;
}

interface DrawingProps {
  // The part of the drawing to show; the whole drawing is { 0.5, 0.5, 1 }.
  readonly frame: VisualFrame;
}

const HALF = 0.5;

// The viewBox that shows a frame of a drawing, so stored frames crop drawn
// art the way they crop an image.
function frameViewBox(box: DrawingBox, frame: VisualFrame): string {
  const size = box.size * frame.size;
  const x = box.x + box.size * (frame.x - HALF * frame.size);
  const y = box.y + box.size * (frame.y - HALF * frame.size);
  return `${x} ${y} ${size} ${size}`;
}

export type { DrawingProps };
export { frameViewBox };
