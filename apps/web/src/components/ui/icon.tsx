import type { JSX } from "react";

// What each icon draws on a 16 by 16 grid: an outline, in strokes, and
// optionally a shape filled in the same colour.
interface IconPaths {
  readonly stroke: string;
  readonly fill?: string;
}

const ICON_PATHS = {
  shield: { stroke: "M2 2h12v6c0 4-6 6-6 6S2 12 2 8zM6 2V1m4 1V1M6 6h4v4H6z" },
  flame: {
    stroke:
      "M8 1c3 4-1 5 1 8 2-1 3-3 3-3 5 6 0 9-4 9-5 0-8-4-4-9 0 3 1 4 2 4-2-4 2-5 2-9z",
  },
  house: { stroke: "M1 7 8 1l7 6M3 6v9h4v-5h3v5h3V6M4 4V1h2v1" },
  tools: {
    stroke: "m2 1 11 13m1-13L3 14M1 10l4 4m6-4 4 4M1 1l2 4 2-2zm14 0-2 4-2-2z",
  },
  market: {
    stroke:
      "M2 6h12v9H2zM1 6l2-5h10l2 5M1 6c0 3 3 3 4 1 1 2 5 2 6 0 1 2 4 2 4-1M6 15v-5h4v5",
  },
  // A circle with an exclamation mark, for something that went wrong.
  alert: {
    stroke:
      "M8 1.75a6.25 6.25 0 1 1 0 12.5 6.25 6.25 0 0 1 0-12.5zM8 4.75v3.75M8 11.25v.01",
  },
  // A checkmark for confirming an edit.
  check: { stroke: "M3 8l3 3 7-7" },
  // A circle, half filled: light and dark, for the site's appearance.
  appearance: {
    stroke: "M8 1.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13z",
    fill: "M8 1.5a6.5 6.5 0 0 1 0 13z",
  },
  // A left-pointing arrow, back to where a page sits.
  "arrow-left": { stroke: "M13 8H3M7 4 3 8l4 4" },
  // An open book, for the manual's sections.
  book: {
    stroke:
      "M8 4C6.5 3 4.5 2.75 2 3v9.5c2.5-.25 4.5 0 6 1 1.5-1 3.5-1.25 6-1V3c-2.5-.25-4.5 0-6 1zM8 4v9.5",
  },
  // A downward chevron, for a list or a section that opens.
  "chevron-down": { stroke: "m4 6 4 4 4-4" },
  // Left and right chevrons, for the previous and next of a series.
  "chevron-left": { stroke: "m10 4-4 4 4 4" },
  "chevron-right": { stroke: "m6 4 4 4-4 4" },
  // A cross, for closing a panel.
  close: { stroke: "M4 4l8 8M12 4l-8 8" },
  // An arrow leaving a box, for a link that opens a new tab.
  external: { stroke: "M9.5 2.5h4v4M13.5 2.5 8 8M11.5 9.5v4h-9v-9h4" },
  // A flag on its pole, for a milestone of a project's progress.
  flag: { stroke: "M3.5 14V2.5M3.5 3h8.5l-2.25 3 2.25 3H3.5" },
  // A picture, for attaching an image.
  image: { stroke: "M2 2h12v12H2zM2 11l4-4 3 3 2-2 3 3M10 5h.01" },
  // Three lines, for the site's menu.
  menu: { stroke: "M2.5 4h11M2.5 8h11M2.5 12h11" },
  // A page with lines and a folded corner, for a quick note.
  note: {
    stroke: "M3.5 1.75h6l3 3v9.5h-9zM9.5 1.75v3h3M5.75 8h4.5M5.75 10.75h4.5",
  },
  // A plus sign, for making something new.
  plus: { stroke: "M8 3v10M3 8h10" },
  // A pencil, for changing a name or the project's memory.
  pencil: { stroke: "M10.5 2.5l3 3-8 8h-3v-3zM9 4l3 3" },
  // A magnifying glass, for a search of the manual.
  search: {
    stroke: "M7 2.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9zM10.5 10.5l3 3",
  },
  // A bin, for deleting something.
  trash: { stroke: "M2.5 4h11M6 4V2.5h4V4M4 4l.75 9.5h6.5L12 4" },
  // A paper plane, for sending a message.
  send: { stroke: "M2.5 8 13.5 2.5 11 13.5 8 9.5zM8 9.5l5.5-7" },
  // A cog, for the site's settings.
  gear: {
    stroke:
      "M8 5.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M12.6 3.4l-1.4 1.4M4.8 11.2l-1.4 1.4",
  },
  // A compass rose, for the way back to the map.
  compass: {
    stroke:
      "M8 1.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13zM10.75 5.25 9 9l-3.75 1.75L7 7z",
  },
} as const;

type IconName = keyof typeof ICON_PATHS;

// A small line icon in the text colour around it, as tall as a line of that
// text, so it lines up with the first line beside it however many lines
// wrap (put the two in an .icon-line, src/app/page-roles.css). It is
// decoration: the words beside it carry the meaning, so assistive
// technology skips it. className adds layout utilities, such as a position
// or a turn.
function Icon({
  name,
  className = "",
}: {
  readonly name: IconName;
  readonly className?: string;
}): JSX.Element {
  const paths: IconPaths = ICON_PATHS[name];
  return (
    <span className={`icon ${className}`}>
      <svg
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        viewBox="0 0 16 16"
      >
        <path d={paths.stroke} />
        {paths.fill !== undefined && (
          <path d={paths.fill} fill="currentColor" stroke="none" />
        )}
      </svg>
    </span>
  );
}

export { Icon };
