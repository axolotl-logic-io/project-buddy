// How full a drawn progress ring is, read from what the browser draws rather
// than from class names or markup: the ring's arc is the one stroke inside it
// that is dashed, and the visible part of its first dash, over the stroke's
// length, is how much of the ring is filled. That holds whether the arc draws
// a full-length dash pushed back by its offset, or a dash as long as the
// progress, and whether it measures in user units or a pathLength.

// What separates the lengths in a computed stroke-dasharray.
const DASH_SEPARATOR = /[\s,]+/u;

// A dashed stroke: its computed stroke-dasharray isn't "none".
function dashed(element: Element): boolean {
  return getComputedStyle(element).strokeDasharray !== "none";
}

// Every SVG shape inside `within` that is drawn (not hidden) with a dashed
// stroke.
function dashedArcs(within: Element): SVGGeometryElement[] {
  return [...within.querySelectorAll("*")].filter(
    (element): element is SVGGeometryElement =>
      element instanceof SVGGeometryElement &&
      dashed(element) &&
      element.getBoundingClientRect().width > 0,
  );
}

// Whether `within` draws a dashed arc at all.
function drawsArc(within: Element): boolean {
  return dashedArcs(within).length > 0;
}

// The one dashed arc inside `within`; throws, naming `what`, if there is
// none or more than one.
function progressArc(within: Element, what: string): SVGGeometryElement {
  const arcs = dashedArcs(within);
  const [arc] = arcs;
  if (arcs.length !== 1 || arc === undefined) {
    throw new Error(
      `${what} should draw one dashed arc for its progress; it draws ${arcs.length}`,
    );
  }
  return arc;
}

// The length a shape's dashes are measured against: its pathLength, if it
// sets one, or its drawn length.
function dashScale(arc: SVGGeometryElement): number {
  const pathLength = arc.getAttribute("pathLength");
  if (pathLength !== null) {
    return Number.parseFloat(pathLength);
  }
  return arc.getTotalLength();
}

// How much of the ring inside `within` is filled, from 0 to 1.
function filledFraction(within: Element, what: string): number {
  const arc = progressArc(within, what);
  const style = getComputedStyle(arc);
  const [dash = 0] = style.strokeDasharray
    .split(DASH_SEPARATOR)
    .map((part) => Number.parseFloat(part));
  const offset = Number.parseFloat(style.strokeDashoffset) || 0;
  const length = dashScale(arc);
  return Math.min(Math.max(dash - offset, 0), length) / length;
}

export { drawsArc, filledFraction, progressArc };
