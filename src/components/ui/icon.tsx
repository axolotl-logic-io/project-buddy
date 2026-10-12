import type { JSX } from "react";

// What each icon draws on a 16 by 16 grid: an outline, in strokes, and
// optionally a shape filled in the same colour.
interface IconPaths {
  readonly stroke: string;
  readonly fill?: string;
}

const ICON_PATHS = {
  // A circle with an exclamation mark, for something that went wrong.
  alert: {
    stroke:
      "M8 1.75a6.25 6.25 0 1 1 0 12.5 6.25 6.25 0 0 1 0-12.5zM8 4.75v3.75M8 11.25v.01",
  },
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
  // An arrow leaving a box, for a link that opens a new tab.
  external: { stroke: "M9.5 2.5h4v4M13.5 2.5 8 8M11.5 9.5v4h-9v-9h4" },
  // A pencil, for changing a name or the project's memory.
  pencil: { stroke: "M10.5 2.5l3 3-8 8h-3v-3zM9 4l3 3" },
  // A magnifying glass, for a search of the manual.
  search: {
    stroke: "M7 2.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9zM10.5 10.5l3 3",
  },
  // A paper plane, for sending a message.
  send: { stroke: "M2.5 8 13.5 2.5 11 13.5 8 9.5zM8 9.5l5.5-7" },
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
