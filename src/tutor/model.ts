// The one place the tutor's model is chosen: Claude, or the deterministic
// mock when TUTOR_MODEL=mock.
import { createAnthropic } from "@ai-sdk/anthropic";
import { type LanguageModelV4, LoadAPIKeyError } from "@ai-sdk/provider";
import { readAnthropicApiKeyIfSet, readTutorModel } from "@/env.ts";
import { mockTutorModel } from "@/tutor/mock-model.ts";

const TUTOR_MODEL_ID = "claude-sonnet-5-5";

function claudeModel(): LanguageModelV4 {
  const apiKey = readAnthropicApiKeyIfSet();
  if (apiKey === undefined) {
    // The error Anthropic's provider raises for a missing key, so the chat
    // shows the invalid-api-key message.
    throw new LoadAPIKeyError({ message: "ANTHROPIC_API_KEY is not set." });
  }
  return createAnthropic({ apiKey })(TUTOR_MODEL_ID);
}

// The model for one chat reply, read from the environment on every call.
function tutorModel(): LanguageModelV4 {
  const choice = readTutorModel();
  switch (choice) {
    case "claude":
      return claudeModel();
    case "mock":
      return mockTutorModel();
    default: {
      const unreachable: never = choice;
      return unreachable;
    }
  }
}

export { TUTOR_MODEL_ID, tutorModel };
