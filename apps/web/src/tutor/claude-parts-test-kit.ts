// Claude's stream parts that the mock model doesn't make, for the tests that
// check a reply copes with them.
import type {
  LanguageModelV4,
  LanguageModelV4CallOptions,
  LanguageModelV4StreamPart,
  LanguageModelV4StreamResult,
} from "@ai-sdk/provider";

// Claude's parts that the mock model doesn't make, at the start of a model
// call: the provider's call-start part, and a thinking block whose text is
// empty and holds only its signature, as Claude Sonnet 5.5 sends it.
function claudeCallStart(call: number): LanguageModelV4StreamPart[] {
  const reasoningId = `reasoning-${call}`;
  return [
    {
      type: "custom",
      kind: "anthropic.message_start",
      providerMetadata: { anthropic: { model: "claude-sonnet-5-5" } },
    },
    { type: "reasoning-start", id: reasoningId },
    {
      type: "reasoning-delta",
      id: reasoningId,
      delta: "",
      providerMetadata: { anthropic: { signature: `signature-${call}` } },
    },
    { type: "reasoning-end", id: reasoningId },
  ];
}

// model, with Claude's parts and any extra parts at the start of every call.
function withClaudeParts(
  model: LanguageModelV4,
  extraParts: readonly LanguageModelV4StreamPart[] = [],
): LanguageModelV4 {
  let call = 0;
  return {
    ...model,
    doStream: async (
      options: LanguageModelV4CallOptions,
    ): Promise<LanguageModelV4StreamResult> => {
      const result = await model.doStream(options);
      call += 1;
      const parts = [...claudeCallStart(call), ...extraParts];
      return {
        ...result,
        stream: result.stream.pipeThrough(
          new TransformStream<
            LanguageModelV4StreamPart,
            LanguageModelV4StreamPart
          >({
            transform: (
              part: LanguageModelV4StreamPart,
              controller: TransformStreamDefaultController<LanguageModelV4StreamPart>,
            ): void => {
              controller.enqueue(part);
              if (part.type === "stream-start") {
                for (const claudePart of parts) {
                  controller.enqueue(claudePart);
                }
              }
            },
          }),
        ),
      };
    },
  };
}

export { withClaudeParts };
