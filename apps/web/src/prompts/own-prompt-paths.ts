// The page of an own prompt of each kind, which pages link to, such as the
// Marketplace's (src/app/(workspace)/marketplace/). It reads no storage, so
// any page can import it. A kind added to PROMPT_KINDS fails to compile here
// until it is named.
import type { Route } from "next";
import type { PromptKind } from "@/prompts/prompt.ts";

const OWN_PROMPT_PATHS: Readonly<Record<PromptKind, (id: string) => Route>> = {
  construct: (id: string): Route => `/guild/${id}`,
  activity: (id: string): Route => `/activities/${id}`,
  spell: (id: string): Route => `/spellbook/${id}`,
};

// The page of the own prompt of the kind with this id.
function ownPromptPath(kind: PromptKind, id: string): Route {
  return OWN_PROMPT_PATHS[kind](id);
}

export { ownPromptPath };
