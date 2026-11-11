// The one place the construct's models are chosen: Claude, or the deterministic
// mock when CONSTRUCT_MODEL=mock. Sonnet writes replies and openings. No model exists without a quota grant (src/quota/quota.ts), so no
// call starts unless the gold was checked. Every model is made for the user
// the grant is for: each call starts with the user (chat-kickoff.ts) and is
// charged to them at the Claude model's prices (src/quota/spend-meter.ts), the
// mock's calls too.
import { createAnthropic } from "@ai-sdk/anthropic";
import { type LanguageModelV4, LoadAPIKeyError } from "@ai-sdk/provider";
import { wrapLanguageModel } from "ai";
import { readAnthropicApiKeyIfSet, readConstructModel } from "@/env.ts";
import type { ClaudeModelId } from "@/quota/prices.ts";
import type { QuotaGrant } from "@/quota/quota.ts";
import { spendMeter } from "@/quota/spend-meter.ts";
import { NEUTRAL_KICKOFF, userFirst } from "@/replies/chat-kickoff.ts";
import { mockConstructModel } from "@/replies/mock-model.ts";
import { defaultMockScript, type MockScript } from "@/replies/mock-script.ts";

const REPLY_MODEL_ID: ClaudeModelId = "claude-sonnet-5-5";

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
  const choice = readConstructModel();
  switch (choice) {
    case "claude":
      return claudeModel(claudeModelId);
    case "mock":
      return mockConstructModel(mockScript);
    default: {
      const unreachable: never = choice;
      return unreachable;
    }
  }
}

// The model as unwrappedModel chooses it, for the calls grant allows: each
// starts with the user, with the neutral kickoff where it would start with
// the construct, and is charged to the grant's acting user at claudeModelId's prices.
function chooseModel(
  claudeModelId: ClaudeModelId,
  mockScript: MockScript,
  grant: QuotaGrant,
): LanguageModelV4 {
  return wrapLanguageModel({
    model: unwrappedModel(claudeModelId, mockScript),
    middleware: [
      userFirst(NEUTRAL_KICKOFF),
      spendMeter({
        owner: grant.owner,
        modelId: claudeModelId,
        usage: grant.usage,
      }),
    ],
  });
}

// The model for the chat replies and openings grant allows, read from the
// environment on every call.
function replyModel(grant: QuotaGrant): LanguageModelV4 {
  return chooseModel(REPLY_MODEL_ID, defaultMockScript, grant);
}

export { REPLY_MODEL_ID, replyModel };
