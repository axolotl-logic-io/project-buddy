import type { SyntheticEvent } from "react";

// A side panel, the site panel or the quest panel, shows or goes at once
// when the page opens or closes it, such as a docked panel restored as the
// page loads, and slides in and out once the user has opened or closed it
// (page-roles.css). Call this as the user opens or closes the panel's
// dialog, before the dialog changes.
function slideFromNow(dialog: HTMLDialogElement | null): void {
  if (dialog === null || dialog.hasAttribute("data-slides")) {
    return;
  }
  dialog.setAttribute("data-slides", "");
  // A closed panel now waits beyond its edge. Styling it there before it
  // opens gives the first slide in its start.
  getComputedStyle(dialog).getPropertyValue("translate");
}

// For a dialog's cancel event: Escape, or a click beside a drawer, which
// the browser follows by closing the dialog itself.
function slideOnCancel(event: SyntheticEvent<HTMLDialogElement>): void {
  slideFromNow(event.currentTarget);
}

export { slideFromNow, slideOnCancel };
