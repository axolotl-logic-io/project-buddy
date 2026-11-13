import { ListChecks, Pencil } from "lucide-react";
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
  grip: {
    stroke: "M5.5 3h.01M10.5 3h.01M5.5 8h.01M10.5 8h.01M5.5 13h.01M10.5 13h.01",
  },
  circle: { stroke: "M8 1.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13z" },
  // A checkmark for confirming an edit.
  check: { stroke: "M3 8l3 3 7-7" },
  // Arrows for moving an item up or down a list, such as a plan's steps.
  "arrow-up": { stroke: "M8 13V3M4 7l4-4 4 4" },
  "arrow-down": { stroke: "M8 3v10M4 9l4 4 4-4" },
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
  // A flag on its pole, for a milestone of a quest's progress.
  flag: { stroke: "M3.5 14V2.5M3.5 3h8.5l-2.25 3 2.25 3H3.5" },
  // A picture, for attaching an image.
  image: { stroke: "M2 2h12v12H2zM2 11l4-4 3 3 2-2 3 3M10 5h.01" },
  // Three lines, for the site's menu.
  menu: { stroke: "M2.5 4h11M2.5 8h11M2.5 12h11" },
  // A page with a docked side panel, for the quest sidebar.
  sidebar: { stroke: "M2 2.5h12v11H2zM10 2.5v11" },
  // Three dots, for additional actions.
  more: { stroke: "M3 8h.01M8 8h.01M13 8h.01" },
  // A plus sign, for making something new.
  plus: { stroke: "M8 3v10M3 8h10" },
  // A magnifying glass, for a search of the manual.
  search: {
    stroke: "M7 2.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9zM10.5 10.5l3 3",
  },
  // A battery, part charged, for the user's batteries.
  battery: {
    stroke:
      "M2.5 4.5h9a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1zM14.5 7v2",
    fill: "M3.5 6.5h5v3h-5z",
  },
  // A bin, for deleting something.
  trash: { stroke: "M2.5 4h11M6 4V2.5h4V4M4 4l.75 9.5h6.5L12 4" },
  // A paper plane, for sending a message.
  send: { stroke: "M2.5 8 13.5 2.5 11 13.5 8 9.5zM8 9.5l5.5-7" },
  // A filled square, for stopping a reply that runs.
  stop: { stroke: "M4.5 4.5h7v7h-7z", fill: "M4.5 4.5h7v7h-7z" },
  // A sun, for starting the day.
  sun: {
    stroke:
      "M8 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M12.95 3.05l-1.06 1.06M4.11 11.89l-1.06 1.06",
  },
  // A cog, for the site's settings.
  gear: {
    stroke:
      "M8 5.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M12.6 3.4l-1.4 1.4M4.8 11.2l-1.4 1.4",
  },
  // A compass rose, for the way back to Quests.
  compass: {
    stroke:
      "M8 1.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13zM10.75 5.25 9 9l-3.75 1.75L7 7z",
  },
} as const;

// Shared symbols for Plan and editing controls.
const PLACE_ICONS = {
  checklist: ListChecks,
  pencil: Pencil,
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
        <path d={paths.stroke} />
        {paths.fill !== undefined && (
          <path d={paths.fill} fill="currentColor" stroke="none" />
        )}
      </svg>
    </span>
  );
}

export { Icon };
