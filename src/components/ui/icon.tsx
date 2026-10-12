import type { JSX } from "react";

// The outline of each icon, drawn on a 16 by 16 grid.
const ICON_PATHS = {
  // A circle with an exclamation mark, for something that went wrong.
  alert:
    "M8 1.75a6.25 6.25 0 1 1 0 12.5 6.25 6.25 0 0 1 0-12.5zM8 4.75v3.75M8 11.25v.01",
  // A left-pointing arrow, back to where a page sits.
  "arrow-left": "M13 8H3M7 4 3 8l4 4",
  // An open book, for the manual's sections.
  book: "M8 4C6.5 3 4.5 2.75 2 3v9.5c2.5-.25 4.5 0 6 1 1.5-1 3.5-1.25 6-1V3c-2.5-.25-4.5 0-6 1zM8 4v9.5",
  // A downward chevron, for a list or a section that opens.
  "chevron-down": "m4 6 4 4 4-4",
  // An arrow leaving a box, for a link that opens a new tab.
  external: "M9.5 2.5h4v4M13.5 2.5 8 8M11.5 9.5v4h-9v-9h4",
  // A pencil, for changing a name or the project's memory.
  pencil: "M10.5 2.5l3 3-8 8h-3v-3zM9 4l3 3",
  // A magnifying glass, for a search of the manual.
  search: "M7 2.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9zM10.5 10.5l3 3",
  // A paper plane, for sending a message.
  send: "M2.5 8 13.5 2.5 11 13.5 8 9.5zM8 9.5l5.5-7",
} as const;

type IconName = keyof typeof ICON_PATHS;

// A small line icon in the text colour around it, as tall as a line of that
// text, so it lines up with the first line beside it however many lines
// wrap. It is decoration: the words beside it carry the meaning, so
// assistive technology skips it. className adds layout utilities, such as a
// position or a turn.
function Icon({
  name,
  className = "",
}: {
  readonly name: IconName;
  readonly className?: string;
}): JSX.Element {
  return (
    <span className={`flex h-lh shrink-0 items-center ${className}`}>
      <svg
        aria-hidden="true"
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        viewBox="0 0 16 16"
      >
        <path d={ICON_PATHS[name]} />
      </svg>
    </span>
  );
}

export { Icon };
