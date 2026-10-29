// The app's log, which Vercel collects from the console: one line per
// failure on the error stream, and one diagnostics line per buddy reply on
// the info stream. The only module that writes to the console.
import type { ContentPart, StepResult, ToolSet } from "ai";
import type { EmailProblem } from "@/email/email-failure.ts";
import { anthropicErrorDetails } from "@/errors/anthropic-errors.ts";
import type { AppErrorCase } from "@/errors/app-error.ts";
import {
  databaseErrorDetails,
  describeDatabaseQuery,
} from "@/errors/neon-errors.ts";

type ErrorDetails = Readonly<Record<string, unknown>>;

// One model call of a buddy reply, as its diagnostics line reads it.
type ReplyStep = Pick<
  StepResult<ToolSet>,
  "finishReason" | "rawFinishReason" | "content" | "usage"
>;

const MAX_DESCRIBED_DEPTH = 4;

// Any other error's own `code`, such as Node's "UND_ERR_SOCKET".
function codeDetails(error: Error, details: ErrorDetails): ErrorDetails {
  const { code } = details;
  if (code !== undefined || !("code" in error)) {
    return {};
  }
  return { code: error.code };
}

function causeDetails(
  error: Error,
  describeCause: (cause: unknown) => ErrorDetails,
): ErrorDetails {
  if (error.cause === undefined) {
    return {};
  }
  return { cause: describeCause(error.cause) };
}

// The fields worth logging from an error and its causes: its name and
// message, the fields its provider module picks, and its cause.
function describeError(error: unknown, depth: number): ErrorDetails {
  if (!(error instanceof Error)) {
    return { value: String(error) };
  }
  function describeCause(cause: unknown): ErrorDetails {
    return describeError(cause, depth + 1);
  }
  const query = describeDatabaseQuery(error, describeCause);
  if (query !== undefined) {
    return query;
  }
  if (depth > MAX_DESCRIBED_DEPTH) {
    return { name: error.name, message: error.message };
  }
  const details: ErrorDetails = {
    name: error.name,
    message: error.message,
    ...anthropicErrorDetails(error, describeCause),
    ...databaseErrorDetails(error, describeCause),
  };
  return {
    ...details,
    ...codeDetails(error, details),
    ...causeDetails(error, describeCause),
  };
}

// A part's type, never its content: a tool part with its tool's name, a
// reasoning part as empty (signature only) or not, a custom part with its
// kind.
function partType(part: ContentPart<ToolSet>): string {
  switch (part.type) {
    case "reasoning": {
      if (part.text === "") {
        return "reasoning:empty";
      }
      return "reasoning:text";
    }
    case "tool-call":
    case "tool-result":
    case "tool-error":
      return `${part.type}:${part.toolName}`;
    case "custom":
      return `custom:${part.kind}`;
    case "text":
    case "reasoning-file":
    case "source":
    case "file":
    case "tool-approval-request":
    case "tool-approval-response":
      return part.type;
    default: {
      const unhandled: never = part;
      return unhandled;
    }
  }
}

function textLength(steps: readonly ReplyStep[]): number {
  return steps
    .flatMap((step) => step.content)
    .reduce((chars, part) => {
      if (part.type === "text") {
        return chars + part.text.length;
      }
      return chars;
    }, 0);
}

function tokens(
  steps: readonly ReplyStep[],
  count: (usage: ReplyStep["usage"]) => number | undefined,
): number {
  return steps.reduce((total, step) => total + (count(step.usage) ?? 0), 0);
}

// Logs one buddy reply as `[buddy-steps]` followed by JSON: the facts the
// buddy passes (whether the answer-now call ran, whether the step limit
// stopped the reply's model calls, whether any call cited the manual), then
// from the steps how many characters of text the reply holds, its tokens
// over every model call, and for each call how it finished (the AI SDK's
// reason and Anthropic's stop_reason), the input tokens it was sent, which
// show whether the answer-now call got the reply's searches, and the types
// of the parts it returned. It never logs text, tool input or output,
// prompts or ids.
export function logReplySteps(
  steps: readonly ReplyStep[],
  {
    answerNow,
    stoppedAtStepLimit,
    calledCiteManual,
  }: {
    answerNow: boolean;
    stoppedAtStepLimit: boolean;
    calledCiteManual: boolean;
  },
): void {
  console.info(
    "[buddy-steps]",
    JSON.stringify({
      answerNow,
      stoppedAtStepLimit,
      calledCiteManual,
      textChars: textLength(steps),
      tokens: {
        input: tokens(steps, (usage) => usage.inputTokens),
        cacheRead: tokens(
          steps,
          (usage) => usage.inputTokenDetails.cacheReadTokens,
        ),
        cacheWrite: tokens(
          steps,
          (usage) => usage.inputTokenDetails.cacheWriteTokens,
        ),
        output: tokens(steps, (usage) => usage.outputTokens),
      },
      steps: steps.map((step) => ({
        finish: step.finishReason,
        raw: step.rawFinishReason ?? null,
        input: step.usage.inputTokens ?? null,
        parts: step.content.map(partType),
      })),
    }),
  );
}

// Logs `error` as `[app-error] <case> in <operation>` followed by its
// details as JSON, without prompts, query parameters or secrets.
export function logAppError(
  errorCase: AppErrorCase,
  operation: string,
  error: unknown,
): void {
  console.error(
    `[app-error] ${errorCase} in ${operation}`,
    JSON.stringify(describeError(error, 0)),
  );
}

// Logs an email the site couldn't send as `[email-error] <problem> in
// <operation>` followed by error's details as JSON. The user is never told,
// so this line is the only sign of it. Callers pass errors that hold no
// address or link (EmailFailure, AppError).
export function logEmailFailure(
  problem: EmailProblem,
  operation: string,
  error: unknown,
): void {
  console.error(
    `[email-error] ${problem} in ${operation}`,
    JSON.stringify(describeError(error, 0)),
  );
}

// One model call's cost, as its diagnostics line reads it.
export interface ModelCallSpend {
  // A streamed call (a step of a reply or an opening) or a generated one
  // (a chat's naming).
  readonly kind: "stream" | "generate";
  readonly modelId: string;
  // Whether the call reported its usage when it finished. A call that
  // stopped without it is charged an estimate.
  readonly finished: boolean;
  // Whether Anthropic's usage split cache writes into 5-minute and 1-hour
  // ones (its `cache_creation`).
  readonly cacheCreationReported: boolean;
  // As src/quota/prices.ts prices them.
  readonly tokens: {
    readonly input: number;
    readonly cacheRead: number;
    readonly cacheWrite5m: number;
    readonly cacheWrite1h: number;
    readonly output: number;
  };
  readonly microUsd: number;
}

// Logs one charged model call as `[model-call-spend]` followed by JSON: its
// kind, model, whether it finished, whether Anthropic split its cache
// writes, its tokens by price and its cost. It never logs text, ids or who
// made the call.
export function logModelCallSpend(spend: ModelCallSpend): void {
  console.info("[model-call-spend]", JSON.stringify(spend));
}
