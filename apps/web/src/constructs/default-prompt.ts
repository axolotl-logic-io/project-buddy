import type { ConstructDefinition } from "@/constructs/construct.ts";
import {
  DEFAULT_CONSTRUCT_ID,
  getConstruct,
  isConstructId,
} from "@/constructs/index.ts";
import type { ResetPrompt } from "@/prompts/prompt.ts";

// What resetting a construct cloned from source restores: the built-in construct's
// prompt it was customized from, or else the default construct's.
export function constructResetPrompt(source: string | undefined): ResetPrompt {
  let construct = getConstruct(DEFAULT_CONSTRUCT_ID);
  if (source !== undefined && isConstructId(source)) {
    construct = getConstruct(source);
  }
  return { source: construct.name, prompt: construct.definition.prompt };
}
export function starterConstructDefinition(): ConstructDefinition {
  return { prompt: constructResetPrompt(undefined).prompt };
}
