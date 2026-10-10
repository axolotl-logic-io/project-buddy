import { anthropic } from "@ai-sdk/anthropic";

// The one place the tutor's Claude model is chosen. The Anthropic provider
// reads ANTHROPIC_API_KEY from the environment.
export const TUTOR_MODEL_ID = "claude-sonnet-5-5";

export function tutorModel(): ReturnType<typeof anthropic> {
  return anthropic(TUTOR_MODEL_ID);
}
