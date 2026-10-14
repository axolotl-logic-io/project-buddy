// Charges every model call to the user it is made for: an AI SDK middleware
// (src/tutor/model.ts wraps every model in it) that prices each call's
// tokens (prices.ts) and adds the cost to the user's month (spend-store.ts).
// A streamed call is charged when its usage arrives with `finish`, before
// `finish` goes on, so the cost is stored before the reply's response ends;
// a stream that stops without `finish` is charged an estimate. A generated
// call is charged when it returns.
import type {
  LanguageModelV4GenerateResult,
  LanguageModelV4Middleware,
  LanguageModelV4StreamPart,
  LanguageModelV4StreamResult,
  LanguageModelV4Usage,
  SharedV4ProviderMetadata,
} from "@ai-sdk/provider";
import { logModelCallSpend } from "@/errors/error-log.ts";
import type { UserId } from "@/ids.ts";
import {
  type AnthropicUsage,
  readAnthropicUsage,
} from "@/quota/anthropic-usage.ts";
import {
  type CallTokens,
  type ClaudeModelId,
  callCost,
} from "@/quota/prices.ts";
import { recordSpend } from "@/quota/spend-store.ts";

// Claude's tokens are about four characters of English each, so a stream
// that stops without its usage is charged its output at that rate.
const CHARS_PER_TOKEN = 4;

// A call's tokens as they are priced, and whether Anthropic said how long
// its cache writes last.
interface MeteredTokens {
  readonly tokens: CallTokens;
  readonly cacheCreationReported: boolean;
}

// Adds a metered call's cost to its user's month.
type Charge = (finished: boolean, metered: MeteredTokens) => Promise<void>;

// The cache writes, split into 5-minute and 1-hour ones as Anthropic says.
// Without its split, every write is a 5-minute one: the only kind the tutor
// asks for (src/tutor/prompt-cache.ts).
function meteredTokens(
  tokens: Omit<CallTokens, "cacheWrite5m" | "cacheWrite1h">,
  cacheWrite: number,
  anthropicUsage: AnthropicUsage | undefined,
): MeteredTokens {
  const split = anthropicUsage?.cacheWriteSplit;
  if (split === undefined) {
    return {
      tokens: { ...tokens, cacheWrite5m: cacheWrite, cacheWrite1h: 0 },
      cacheCreationReported: false,
    };
  }
  const cacheWrite1h = Math.min(split.cacheWrite1h, cacheWrite);
  return {
    tokens: {
      ...tokens,
      cacheWrite5m: cacheWrite - cacheWrite1h,
      cacheWrite1h,
    },
    cacheCreationReported: true,
  };
}

// The tokens of a call that finished with its usage.
function finishedCallTokens(
  usage: LanguageModelV4Usage,
  providerMetadata: SharedV4ProviderMetadata | undefined,
): MeteredTokens {
  return meteredTokens(
    {
      input: usage.inputTokens.noCache ?? 0,
      cacheRead: usage.inputTokens.cacheRead ?? 0,
      output: usage.outputTokens.total ?? 0,
    },
    usage.inputTokens.cacheWrite ?? 0,
    readAnthropicUsage(providerMetadata),
  );
}

// An estimate of the tokens of a stream that stopped without its usage: its
// input as Anthropic counted it when the message started (none if it never
// started), and its output from the characters it streamed.
function stoppedCallTokens(
  startUsage: AnthropicUsage | undefined,
  outputChars: number,
): MeteredTokens {
  return meteredTokens(
    {
      input: startUsage?.input ?? 0,
      cacheRead: startUsage?.cacheRead ?? 0,
      output: Math.ceil(outputChars / CHARS_PER_TOKEN),
    },
    startUsage?.cacheWrite ?? 0,
    startUsage,
  );
}

// The characters of model output a stream part carries.
function outputCharsOf(part: LanguageModelV4StreamPart): number {
  switch (part.type) {
    case "text-delta":
    case "reasoning-delta":
    case "tool-input-delta":
      return part.delta.length;
    default:
      return 0;
  }
}

// The usage Anthropic sends as a stream's message starts, in the custom
// part its provider passes it in.
function startUsageOf(
  part: LanguageModelV4StreamPart,
): AnthropicUsage | undefined {
  if (part.type === "custom" && part.kind === "anthropic.message_start") {
    return readAnthropicUsage(part.providerMetadata);
  }
  return undefined;
}

// The model's stream, charged once: at `finish` with its usage, or with an
// estimate when it ends, fails or is cancelled without one. A pull source
// over the model's stream rather than a TransformStream, whose transformer
// can't see the model's stream fail or the reader cancel in every runtime.
function meteredStream(
  stream: ReadableStream<LanguageModelV4StreamPart>,
  charge: Charge,
): ReadableStream<LanguageModelV4StreamPart> {
  const reader = stream.getReader();
  // The one charge, shared, so a cancel waits for a charge a pending read
  // started as the cancel ended the model's stream.
  let charging: Promise<void> | undefined;
  let cancelled = false;
  let startUsage: AnthropicUsage | undefined;
  let outputChars = 0;

  function chargeOnce(
    finished: boolean,
    metered: MeteredTokens,
  ): Promise<void> {
    charging ??= charge(finished, metered);
    return charging;
  }

  function chargeEstimate(): Promise<void> {
    return chargeOnce(false, stoppedCallTokens(startUsage, outputChars));
  }

  return new ReadableStream<LanguageModelV4StreamPart>({
    async pull(
      controller: ReadableStreamDefaultController<LanguageModelV4StreamPart>,
    ): Promise<void> {
      let next: ReadableStreamReadResult<LanguageModelV4StreamPart>;
      try {
        next = await reader.read();
      } catch (error) {
        await chargeEstimate();
        controller.error(error);
        return;
      }
      if (next.done) {
        await chargeEstimate();
        if (!cancelled) {
          controller.close();
        }
        return;
      }
      const part = next.value;
      startUsage = startUsageOf(part) ?? startUsage;
      outputChars += outputCharsOf(part);
      if (part.type === "finish") {
        await chargeOnce(
          true,
          finishedCallTokens(part.usage, part.providerMetadata),
        );
      }
      controller.enqueue(part);
    },
    async cancel(reason: unknown): Promise<void> {
      cancelled = true;
      await reader.cancel(reason);
      await chargeEstimate();
    },
  });
}

// The middleware that charges owner for every call of the model it wraps,
// at the prices of modelId: the Claude model the call is for, also when the
// mock stands in for it.
function spendMeter({
  owner,
  modelId,
}: {
  owner: UserId;
  modelId: ClaudeModelId;
}): LanguageModelV4Middleware {
  // Adds the call's cost to owner's month and logs it. A cost that can't be
  // stored, even after the store's retries, is logged (spend-store.ts) and
  // lost rather than failing a reply Claude has written.
  function chargeFor(kind: "stream" | "generate"): Charge {
    return async (
      finished: boolean,
      { tokens, cacheCreationReported }: MeteredTokens,
    ): Promise<void> => {
      const microUsd = callCost(modelId, tokens);
      logModelCallSpend({
        kind,
        modelId,
        finished,
        cacheCreationReported,
        tokens,
        microUsd,
      });
      await recordSpend(owner, microUsd, new Date()).catch(() => {
        // Logged as database-query-failed where it failed.
      });
    };
  }

  return {
    specificationVersion: "v4",
    async wrapGenerate({
      doGenerate,
    }: {
      doGenerate: () => PromiseLike<LanguageModelV4GenerateResult>;
    }): Promise<LanguageModelV4GenerateResult> {
      const result = await doGenerate();
      await chargeFor("generate")(
        true,
        finishedCallTokens(result.usage, result.providerMetadata),
      );
      return result;
    },
    async wrapStream({
      doStream,
    }: {
      doStream: () => PromiseLike<LanguageModelV4StreamResult>;
    }): Promise<LanguageModelV4StreamResult> {
      const { stream, ...rest } = await doStream();
      return { stream: meteredStream(stream, chargeFor("stream")), ...rest };
    },
  };
}

export { spendMeter };
