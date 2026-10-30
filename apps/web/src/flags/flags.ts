// The site's extras: parts of a page that the user may hide on the Settings
// page, such as the buddy's working notes in a chat. Each extra is one flag
// here, shown or hidden by default (most show; a flag may be off by default)
// until the user switches it. Every flag only changes what is shown: the
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
// 5. Its entry in EXTRA_SCENES in test/component-integration/flags/hide-extras.browser.test.tsx
//    (tsc fails until it's there), which checks that hiding it shows less
//    of it and leaves the other extras as they were.
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
  // The lines saying what the buddy searched for, and those saying a tool
  // failed.
  { id: "tool-lines", copyKey: "toolLines", defaultOn: true },
  // Hiding it unpins the chat's header rather than removing it.
  { id: "pinned-chat-header", copyKey: "pinnedChatHeader", defaultOn: true },
  // The names in a project's chat list; a hidden name reads as an unnamed
  // chat's does.
  { id: "chat-names", copyKey: "chatNames", defaultOn: true },
  // The theme's background behind every page.
  { id: "page-decorations", copyKey: "pageDecorations", defaultOn: true },
  // This month's spend out of the quota, on the account page.
  { id: "usage-meter", copyKey: "usageMeter", defaultOn: true },
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

// The flags hidden for a user who has switched exactly switched away from
// their default, in FLAGS' order. Her account and cookie keep the switched
// flags, so every value saved before any flag was off by default still means
// what it did. Unknown ids and repeats are left out.
function hiddenFromSwitched(switched: readonly string[]): FlagId[] {
  return FLAGS.filter(
    (flag: Flag) => flag.defaultOn === switched.includes(flag.id),
  ).map(({ id }) => id);
}

// The flags switched away from their default for a user who hides exactly
// hidden, in FLAGS' order: hiddenFromSwitched's inverse. Unknown ids and
// repeats are left out.
function switchedFromHidden(hidden: readonly string[]): FlagId[] {
  return FLAGS.filter(
    (flag: Flag) => flag.defaultOn === hidden.includes(flag.id),
  ).map(({ id }) => id);
}

// The attribute that marks an element as the extra id, for extras.css to
// hide: spread it on the extra's root, <p {...extraTag("tool-lines")}>.
function extraTag(id: FlagId): { readonly "data-extra": FlagId } {
  return { "data-extra": id };
}

export type { FlagId };
export {
  DEFAULT_HIDDEN_FLAGS,
  extraTag,
  FLAG_IDS,
  FLAGS,
  hiddenFromSwitched,
  knownFlags,
  switchedFromHidden,
};
