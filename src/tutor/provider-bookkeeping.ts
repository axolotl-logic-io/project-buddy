// The parts a model provider adds to a reply for its own bookkeeping, which
// the user never needs and a saved reply doesn't keep. Today that is
// Anthropic's call-start part: it holds only one model call's usage, which
// the reply's diagnostics already count.
import type { UIMessage } from "ai";

const ANTHROPIC_CALL_START_KIND = "anthropic.message_start";

// message without its provider bookkeeping parts.
function withoutProviderBookkeeping(message: UIMessage): UIMessage {
  return {
    ...message,
    parts: message.parts.filter(
      (part) =>
        !(part.type === "custom" && part.kind === ANTHROPIC_CALL_START_KIND),
    ),
  };
}

export { withoutProviderBookkeeping };
