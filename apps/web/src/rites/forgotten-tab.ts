import { z } from "zod";

// What the Grimoire's Forgotten tab reports after the user forgets,
// restores or deletes a rite, or tries to change one that is unavailable.
const RITE_CHANGE = z.enum(["forget", "restore", "delete", "unavailable"]);
type RiteChange = z.infer<typeof RITE_CHANGE>;

// The Forgotten tab, reporting the change to the rite with the given id.
function forgottenTabHref(change: RiteChange, id?: string): string {
  const search = new URLSearchParams({ filter: "forgotten", changed: change });
  if (id !== undefined) {
    search.set("rite", id);
  }
  return `/grimoire?${search.toString()}`;
}

export type { RiteChange };
export { forgottenTabHref, RITE_CHANGE };
