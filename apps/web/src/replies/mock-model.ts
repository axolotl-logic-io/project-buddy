import type { LanguageModelV4 } from "@ai-sdk/provider";
import { defaultMockScript, type MockScript } from "@/replies/mock-script.ts";
import { scriptedModel } from "@/replies/scripted-model.ts";

function mockConstructModel(
  script: MockScript = defaultMockScript,
): LanguageModelV4 {
  return scriptedModel(script, {
    provider: "mock",
    modelId: "construct-mock",
    usage: {
      inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
      outputTokens: { total: 1, text: 1, reasoning: undefined },
    },
  });
}

export { mockConstructModel };
