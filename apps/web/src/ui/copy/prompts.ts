import type { PromptKind } from "@/prompts/prompt.ts";

// What deleting one of the user's own buddies, activities or spells says,
// the same wherever it is offered.
interface DeleteKindCopy {
  readonly title: string;
  readonly confirm: string;
  readonly consequence: (name: string) => string;
}

const DELETE_KINDS: Readonly<Record<PromptKind, DeleteKindCopy>> = {
  buddy: {
    title: "Delete this buddy?",
    confirm: "Delete buddy",
    consequence: (name: string): string =>
      `“${name}” will be gone from your buddies, so new chats can't choose it. Chats that already have it keep it as it was.`,
  },
  activity: {
    title: "Delete this activity?",
    confirm: "Delete activity",
    consequence: (name: string): string =>
      `“${name}” will be gone from your activities, so no chat can start it or change to it. Chats already in it keep its instructions as they were.`,
  },
  spell: {
    title: "Delete this spell?",
    confirm: "Delete spell",
    consequence: (name: string): string =>
      `“${name}” will be gone from your Spellbook, and your buddy won't cast it again. Chats that already cast it keep what it said.`,
  },
};

// How one of the user's own buddies, activities or spells is tied to the
// Marketplace, as deleting it tells them: not at all, bought there (or
// cloned from a bought one), or listed there now.
type MarketplaceTie = "none" | "bought" | "listed";

// The text every prompt's page shares, a buddy's, an activity's or a
// spell's.
export const PROMPT_COPY = {
  nameLabel: "Name",
  promptHeading: "Prompt",
  namePlaceholderHint:
    "Any {{name}} here is replaced with your name, as set on your account page, or “the user” if you have none.",
  limit: (max: number): string =>
    `At most ${max.toLocaleString("en-US")} characters.`,
  save: "Save",
  reset: "Reset to default",
  resetLabel: (part: string): string => `Reset ${part} to default`,
} as const;

export const DELETE_PROMPT_COPY = {
  delete: "Delete",
  deleteLabel: (name: string): string => `Delete ${name}`,
  cancel: "Keep it",
  title: (kind: PromptKind): string => DELETE_KINDS[kind].title,
  confirm: (kind: PromptKind): string => DELETE_KINDS[kind].confirm,
  description: (
    kind: PromptKind,
    name: string,
    tie: MarketplaceTie,
  ): string => {
    const consequence = DELETE_KINDS[kind].consequence(name);
    if (tie === "bought") {
      return `${consequence} It came from the Marketplace, so deleting it returns no gold. While its listing is up, you can get it again at the listing's price then.`;
    }
    if (tie === "listed") {
      return `${consequence} Its Marketplace listing stays up: others can still get it and buyers keep their copies, but you won't be able to update the listing, only unlist it.`;
    }
    return consequence;
  },
  unlistLink: "Open its listing to unlist it",
} as const;

export type { MarketplaceTie };
