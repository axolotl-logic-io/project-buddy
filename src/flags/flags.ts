// The site's extras: parts of a page that the user may hide on the Settings
// page, such as the tutor's working notes in a chat. Each extra is one flag
// here, shown unless the user switches it off. Hiding is display only: the
// page still renders the extra, with data-extra="<flag id>" on its root, and
// src/flags/extras.css hides it while <html>'s data-hide names the flag.
// Nothing is deleted or left unsaved. The user's choice lives in
// flag-choice.ts, which applies it before the first paint, as the theme is.
//
// ADDING AN EXTRA
// 1. FLAGS below: one entry, with a kebab-case id, its copy key and whether
//    it shows by default.
// 2. src/ui/copy/settings.ts: its label and hint in FLAG_COPY, under the
//    copy key (flags.test.ts checks every key has copy).
// 3. data-extra="<flag id>" on the root of the element it hides.
// 4. src/flags/extras.css: its hide rule (flags.test.ts checks every flag
//    has one, and every rule names a flag).
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

export type { FlagId };
export { DEFAULT_HIDDEN_FLAGS, FLAG_IDS, FLAGS, knownFlags };
