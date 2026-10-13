// The one place the tutor's models are chosen: Claude, or the deterministic
// mock when TUTOR_MODEL=mock. Sonnet replies in chats; the smaller Haiku names
// them. No model exists without a quota grant (src/quota/quota.ts), so no
// call starts unless the quota was checked. Every model is made for the user
// the grant is for: each call starts with the user (chat-kickoff.ts) and is
// charged to them at the Claude model's prices (src/quota/spend-meter.ts), the
// mock's calls too.
import { createAnthropic } from "@ai-sdk/anthropic";
import { type LanguageModelV4, LoadAPIKeyError } from "@ai-sdk/provider";
import { wrapLanguageModel } from "ai";
import { readAnthropicApiKeyIfSet, readTutorModel } from "@/env.ts";
import type { ClaudeModelId } from "@/quota/prices.ts";
import type { QuotaGrant } from "@/quota/quota.ts";
import { spendMeter } from "@/quota/spend-meter.ts";
import { userFirst } from "@/tutor/chat-kickoff.ts";
import { mockChatNameScript } from "@/tutor/mock-chat-name.ts";
import { mockTutorModel } from "@/tutor/mock-model.ts";
import { defaultMockScript, type MockScript } from "@/tutor/mock-script.ts";

const TUTOR_MODEL_ID: ClaudeModelId = "claude-sonnet-5-5";
const CHAT_NAME_MODEL_ID: ClaudeModelId = "claude-haiku-5-5";

function claudeModel(modelId: ClaudeModelId): LanguageModelV4 {
  const apiKey = readAnthropicApiKeyIfSet();
  if (apiKey === undefined) {
    // The error Anthropic's provider raises for a missing key, so the chat
    // shows the invalid-api-key message.
    throw new LoadAPIKeyError({ message: "ANTHROPIC_API_KEY is not set." });
  }
  return createAnthropic({ apiKey })(modelId);
}

// Claude's model `claudeModelId`, or the mock playing `mockScript`, as the
// environment says on this call.
function unwrappedModel(
  claudeModelId: ClaudeModelId,
  mockScript: MockScript,
): LanguageModelV4 {
  const choice = readTutorModel();
  switch (choice) {
    case "claude":
      return claudeModel(claudeModelId);
    case "mock":
      return mockTutorModel(mockScript);
    default: {
      const unreachable: never = choice;
      return unreachable;
    }
  }
}

// The model as unwrappedModel chooses it, for the calls grant allows: each
// starts with the user and is charged to the grant's owner at claudeModelId's
// prices.
function chooseModel(
  claudeModelId: ClaudeModelId,
  mockScript: MockScript,
  grant: QuotaGrant,
): LanguageModelV4 {
  return wrapLanguageModel({
    model: unwrappedModel(claudeModelId, mockScript),
    middleware: [
      userFirst,
      spendMeter({ owner: grant.owner, modelId: claudeModelId }),
    ],
  });
}

// The model for the chat replies and openings grant allows, read from the
// environment on every call.
function tutorModel(grant: QuotaGrant): LanguageModelV4 {
  return chooseModel(TUTOR_MODEL_ID, defaultMockScript, grant);
}

// The model that names a chat, for the reply whose grant it reuses, read from
// the environment on every call. The mock names a chat from the
// conversation's first message (mock-chat-name.ts).
function chatNameModel(grant: QuotaGrant): LanguageModelV4 {
  return chooseModel(CHAT_NAME_MODEL_ID, mockChatNameScript, grant);
}

export { CHAT_NAME_MODEL_ID, chatNameModel, TUTOR_MODEL_ID, tutorModel };
