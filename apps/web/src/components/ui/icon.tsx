import { ListChecks, Pencil, Repeat } from "lucide-react";
import type { JSX } from "react";

// The outline each icon draws on a 16 by 16 grid.
interface IconPaths {
  readonly stroke: string;
  readonly lineJoin?: "miter" | "round" | "bevel";
}

const ICON_PATHS = {
  // A circle with an exclamation mark, for something that went wrong.
  alert: {
    stroke:
      "M8 1.75a6.25 6.25 0 1 1 0 12.5 6.25 6.25 0 0 1 0-12.5zM8 4.75v3.75M8 11.25v.01",
  },
  grip: {
    stroke: "M5.5 3h.01M10.5 3h.01M5.5 8h.01M10.5 8h.01M5.5 13h.01M10.5 13h.01",
  },
  // A checkmark for confirming an edit.
  check: { stroke: "M3 8l3 3 7-7" },
  // Arrows for moving an item up or down a list, such as Tasks.
  "arrow-up": { stroke: "M8 13V3M4 7l4-4 4 4" },
  "arrow-down": { stroke: "M8 3v10M4 9l4 4 4-4" },
  // A left-pointing arrow, back to where a page sits.
  "arrow-left": { stroke: "M13 8H3M7 4 3 8l4 4" },
  // An open book, for the manual's sections.
  book: {
    stroke:
      "M8 4C6.5 3 4.5 2.75 2 3v9.5c2.5-.25 4.5 0 6 1 1.5-1 3.5-1.25 6-1V3c-2.5-.25-4.5 0-6 1zM8 4v9.5",
  },
  // A downward chevron, for a list or a section that opens.
  "chevron-down": { stroke: "m4 6 4 4 4-4" },
  "chevron-right": { stroke: "m6 4 4 4-4 4" },
  // A cross, for closing a panel.
  close: { stroke: "M4 4l8 8M12 4l-8 8" },
  // A flag on its pole, for completed quests.
  flag: { stroke: "M3.5 14V2.5M3.5 3h8.5l-2.25 3 2.25 3H3.5" },
  // A page with a panel docked on its right, for the quest panel.
  sidebar: { stroke: "M2 2.5h12v11H2zM10 2.5v11" },
  // The mirror image, a page with a panel docked on its left, for the site
  // panel, with lines standing for the links in it.
  "site-panel": { stroke: "M2 2.5h12v11H2zM6 2.5v11M3.5 5h1M3.5 7h1" },
  // Three dots, for additional actions.
  more: { stroke: "M3 8h.01M8 8h.01M13 8h.01" },
  // A four-pointed star, for a highlight.
  sparkle: {
    stroke:
      "M8 2c.5 3 1.5 4.5 5 6-3.5 1.5-4.5 3-5 6-.5-3-1.5-4.5-5-6 3.5-1.5 4.5-3 5-6z",
  },
  // An hourglass, for the Timer panel.
  hourglass: {
    stroke:
      "M4 2h8M4 14h8M5 2v2c0 2 3 3 3 4s-3 2-3 4v2m6-12v2c0 2-3 3-3 4s3 2 3 4v2",
  },
  plus: { stroke: "M8 3v10M3 8h10" },
  // A bin, for deleting something.
  trash: { stroke: "M2.5 4h11M6 4V2.5h4V4M4 4l.75 9.5h6.5L12 4" },
  // A sun, for starting the day.
  sun: {
    stroke:
      "M8 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M12.95 3.05l-1.06 1.06M4.11 11.89l-1.06 1.06",
  },
  // The brand: an hourglass inside a gear, also in public/icons/*.svg.
  brand: {
    lineJoin: "miter",
    stroke:
      "M6.944 1.333 9.056 1.333 9.331 2.663 10.833 3.286 11.968 2.539 13.461 4.032 12.714 5.167 13.337 6.669 14.667 6.944 14.667 9.056 13.337 9.331 12.714 10.833 13.461 11.968 11.968 13.461 10.833 12.714 9.331 13.337 9.056 14.667 6.944 14.667 6.669 13.337 5.167 12.714 4.032 13.461 2.539 11.968 3.286 10.833 2.663 9.331 1.333 9.056 1.333 6.944 2.663 6.669 3.286 5.167 2.539 4.032 4.032 2.539 5.167 3.286 6.669 2.663zM7.446 4.628 10.970 5.910 10.713 6.615 8.506 7.780 9.076 10.382 8.819 11.087 5.765 9.975 6.022 9.271 8.506 7.780 7.189 5.332z",
  },
  // A compass rose, for quests.
  compass: {
    stroke:
      "M8 1.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13zM10.75 5.25 9 9l-3.75 1.75L7 7z",
  },
} as const;

// Shared symbols for Tasks and editing controls.
const PLACE_ICONS = {
  checklist: ListChecks,
  pencil: Pencil,
  repeat: Repeat,
} as const;

type PlaceIconName = keyof typeof PLACE_ICONS;

function isPlaceIcon(name: IconName): name is PlaceIconName {
  return Object.hasOwn(PLACE_ICONS, name);
}

type IconName = keyof typeof ICON_PATHS | keyof typeof PLACE_ICONS;

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
  if (isPlaceIcon(name)) {
    const LibraryIcon = PLACE_ICONS[name];
    return (
      <span className={`icon ${className}`}>
        <LibraryIcon aria-hidden="true" focusable="false" />
      </span>
    );
  }
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
        <path d={paths.stroke} strokeLinejoin={paths.lineJoin} />
      </svg>
    </span>
  );
}

export { Icon };
