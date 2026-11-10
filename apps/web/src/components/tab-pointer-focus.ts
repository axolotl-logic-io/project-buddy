import type { FocusEvent, KeyboardEvent, MouseEvent } from "react";

// A Radix tab trigger focuses itself from script when it is clicked, which
// browsers treat like keyboard focus, so a clicked tab would keep its focus
// ring (:focus-visible) beside its underline. These handlers mark a tab
// focused by a click, and page-roles.css draws no ring on a marked tab.
// Any key pressed on it, or focus leaving it, clears the mark, so keyboard
// focus always shows its ring: an arrow key moves focus to an unmarked tab.
const POINTER_FOCUS = "data-pointer-focus";

// For a trigger's onMouseDown.
function markPointerFocus(event: MouseEvent<HTMLButtonElement>): void {
  event.currentTarget.setAttribute(POINTER_FOCUS, "");
}

// For a trigger's onKeyDown and onBlur.
function clearPointerFocus(
  event: KeyboardEvent<HTMLButtonElement> | FocusEvent<HTMLButtonElement>,
): void {
  event.currentTarget.removeAttribute(POINTER_FOCUS);
}

// The handlers, to spread on a trigger.
const POINTER_FOCUS_HANDLERS = {
  onMouseDown: markPointerFocus,
  onKeyDown: clearPointerFocus,
  onBlur: clearPointerFocus,
} as const;

export { POINTER_FOCUS_HANDLERS };
