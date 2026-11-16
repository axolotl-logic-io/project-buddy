import type { MouseEvent } from "react";

// Closes the site panel that holds the clicked control when it is a drawer
// over the page (src/components/site-panel.tsx), which gives focus back to
// the panel's button, and says whether it did. A panel docked beside the
// page stays open.
function closePanelAround(
  event: MouseEvent<HTMLAnchorElement | HTMLButtonElement>,
): boolean {
  const dialog = event.currentTarget.closest("dialog");
  if (dialog?.matches(":modal") !== true) {
    return false;
  }
  dialog.close();
  return true;
}

export { closePanelAround };
