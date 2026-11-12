// The local command engine uses the existing stream and tool protocol.
// Only the opt-in test script retains simulated provider spending.
import type { LanguageModelV4 } from "@ai-sdk/provider";
import { wrapLanguageModel } from "ai";
import { readConstructModel } from "@/env.ts";
import type { ClaudeModelId } from "@/quota/prices.ts";
import type { QuotaGrant } from "@/quota/quota.ts";
import { spendMeter } from "@/quota/spend-meter.ts";
import { NEUTRAL_KICKOFF, userFirst } from "@/replies/chat-kickoff.ts";
import { localConstructModel } from "@/replies/local-model.ts";
import { mockConstructModel } from "@/replies/mock-model.ts";

// Retained for test accounting compatibility; local replies have no model cost.
const REPLY_MODEL_ID: ClaudeModelId = "claude-sonnet-5-5";

function replyModel(grant: QuotaGrant): LanguageModelV4 {
  if (readConstructModel() === "local") {
    return wrapLanguageModel({
      model: localConstructModel(),
      middleware: userFirst(NEUTRAL_KICKOFF),
    });
  }
  return wrapLanguageModel({
    model: mockConstructModel(),
    middleware: [
      userFirst(NEUTRAL_KICKOFF),
      spendMeter({
        owner: grant.owner,
        modelId: REPLY_MODEL_ID,
        usage: grant.usage,
      }),
    ],
  });
}

export { REPLY_MODEL_ID, replyModel };
