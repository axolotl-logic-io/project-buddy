// The local command engine uses the existing stream and tool protocol.
import type { LanguageModelV4 } from "@ai-sdk/provider";
import { wrapLanguageModel } from "ai";
import { NEUTRAL_KICKOFF, userFirst } from "@/replies/chat-kickoff.ts";
import { localConstructModel } from "@/replies/local-model.ts";

function replyModel(): LanguageModelV4 {
  return wrapLanguageModel({
    model: localConstructModel(),
    middleware: userFirst(NEUTRAL_KICKOFF),
  });
}

export { replyModel };
