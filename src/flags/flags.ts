// The site's extras: parts of a page that the user may hide on the Settings
// page, such as the tutor's working notes in a chat. Each extra is one flag
// here, shown unless the user switches it off. Hiding is display only: the
// page still renders the extra, tagged on its root by extraTag(<flag id>),
// and src/flags/extras.css hides it while <html>'s data-hide names the flag.
// Nothing is deleted or left unsaved. The user's choice is saved to her
// account and kept in a cookie (flag-choice.ts, whose header names where
// it is saved and copied), which applies it before the first paint, as the
// theme is.
//
// ADDING AN EXTRA
// 1. FLAGS below: one entry, with a kebab-case id, its copy key and whether
//    it shows by default.
// 2. src/ui/copy/settings.ts: its label and hint in FLAG_COPY, under the
//    copy key (flags.test.ts checks every key has copy).
// 3. {...extraTag("<flag id>")} on the root of the element it hides (tsc
//    rejects an id that isn't in FLAGS; flags.test.ts checks every flag
//    whose rule hides a tagged element is tagged somewhere, and that no
//    component writes the attribute by hand).
// 4. src/flags/extras.css: its hide rule (flags.test.ts checks every flag
//    has one, and every rule names a flag). A rule that hides something
//    other than a tagged element, such as the theme's page decoration in
//    src/themes/contract.css, needs no tag.
import type { FLAG_COPY } from "@/ui/copy/settings.ts";

interface Flag {
  readonly id: string;
  // The flag's label and hint on the Settings page, in FLAG_COPY.
  readonly copyKey: keyof typeof FLAG_COPY;
  // Whether the extra shows for a user who hasn't switched it.
  readonly defaultOn: boolean;
}

// In the order the Settings page lists them.
const FLAGS = [
  { id: "working-notes", copyKey: "workingNotes", defaultOn: true },
  { id: "memory-change-cards", copyKey: "memoryChangeCards", defaultOn: true },
  // The lines saying what the tutor searched for, and those saying a tool
  // failed.
  { id: "tool-lines", copyKey: "toolLines", defaultOn: true },
  // Hiding it unpins the chat's header rather than removing it.
  { id: "pinned-chat-header", copyKey: "pinnedChatHeader", defaultOn: true },
  // The names in a project's chat list; a hidden name reads as an unnamed
  // chat's does.
  { id: "chat-names", copyKey: "chatNames", defaultOn: true },
  // The theme's background behind every page.
  { id: "page-decorations", copyKey: "pageDecorations", defaultOn: true },
] as const;

type FlagId = (typeof FLAGS)[number]["id"];

const FLAG_IDS: readonly FlagId[] = FLAGS.map(({ id }) => id);

// Takes a Flag, so the compiler checks every entry of FLAGS is one.
function isHiddenByDefault(flag: Flag): boolean {
  return !flag.defaultOn;
}

// The flags hidden for a user who hasn't switched any.
const DEFAULT_HIDDEN_FLAGS: readonly FlagId[] = FLAGS.filter(
  isHiddenByDefault,
).map(({ id }) => id);

// The known flags among ids, once each, in FLAGS' order. Anything else in
// ids, such as an extra that no longer exists, is left out.
function knownFlags(ids: readonly string[]): FlagId[] {
  return FLAG_IDS.filter((id) => ids.includes(id));
}

// The attribute that marks an element as the extra id, for extras.css to
// hide: spread it on the extra's root, <p {...extraTag("tool-lines")}>.
function extraTag(id: FlagId): { readonly "data-extra": FlagId } {
  return { "data-extra": id };
}

export type { FlagId };
export { DEFAULT_HIDDEN_FLAGS, extraTag, FLAG_IDS, FLAGS, knownFlags };
