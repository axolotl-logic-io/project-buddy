import type { JSX } from "react";

// Small line icons drawn in the text's colour, sized to the text beside
// them. They are decoration: the text next to each says what it means, so
// each is hidden from assistive technology.

const ICON_CLASSES = "size-4 shrink-0";

// A left-pointing arrow: back to where a page sits.
export function ArrowLeftIcon(): JSX.Element {
  return (
    <svg
      aria-hidden="true"
      className={ICON_CLASSES}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.75"
      viewBox="0 0 16 16"
    >
      <path d="M13 8H3m4-4L3 8l4 4" />
    </svg>
  );
}

// A circle with an exclamation mark: something went wrong.
export function AlertIcon(): JSX.Element {
  return (
    <svg
      aria-hidden="true"
      className={`${ICON_CLASSES} mt-0.5`}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.75"
      viewBox="0 0 16 16"
    >
      <circle cx="8" cy="8" r="6.25" />
      <path d="M8 4.75v3.75m0 2.75v.01" />
    </svg>
  );
}

// A downward chevron: a list or a section that opens.
export function ChevronDownIcon({
  className = "",
}: {
  readonly className?: string;
}): JSX.Element {
  return (
    <svg
      aria-hidden="true"
      className={`${ICON_CLASSES} ${className}`}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.75"
      viewBox="0 0 16 16"
    >
      <path d="m4 6 4 4 4-4" />
    </svg>
  );
}

// A pencil: change a name.
export function PencilIcon(): JSX.Element {
  return (
    <svg
      aria-hidden="true"
      className={ICON_CLASSES}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      viewBox="0 0 16 16"
    >
      <path d="M10.5 2.5 13.5 5.5 6 13H3v-3z" />
    </svg>
  );
}
