import type { Route } from "next";
import type { ReactNode } from "react";

// Zotero setup in the New list dialog, for the quest's owner. Setup reads
// the owner's Zotero connection and collections on the server, so it
// shows only at href, the overview with the dialog open on Zotero
// Collection.
interface NewListZotero {
  readonly href: Route;
  // The overview without setup, where closing the dialog goes.
  readonly back: Route;
  // Setup, when the page is at href.
  readonly setup: ReactNode | undefined;
}

export type { NewListZotero };
