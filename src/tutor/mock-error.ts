// "/mock-error <Anthropic error type>" makes the mock tutor fail the way
// Claude's response stream does when Anthropic sends that error event, such
// as `/mock-error overloaded_error`, so end-to-end tests can drive a failed
// reply through the real error path. Any other message, including an error
// type Anthropic doesn't have, is not a failure.
import type { LanguageModelV4StreamPart } from "@ai-sdk/provider";
import { z } from "zod";

// The error types in Anthropic's API errors documentation.
const ANTHROPIC_ERROR_TYPE = z.enum([
  "invalid_request_error",
  "authentication_error",
  "permission_error",
  "not_found_error",
  "request_too_large",
  "rate_limit_error",
  "api_error",
  "overloaded_error",
  "billing_error",
  "timeout_error",
]);

const MOCK_ERROR_COMMAND = /^\/mock-error (?<errorType>\S+)$/u;

// The stream of a model call that fails at once with the error event that
// userText asks for, or undefined unless userText is a /mock-error command.
function mockErrorChunks(
  userText: string,
): LanguageModelV4StreamPart[] | undefined {
  const { errorType } = MOCK_ERROR_COMMAND.exec(userText.trim())?.groups ?? {};
  const parsed = ANTHROPIC_ERROR_TYPE.safeParse(errorType);
  if (!parsed.success) {
    return undefined;
  }
  return [
    { type: "stream-start", warnings: [] },
    {
      type: "error",
      error: { type: parsed.data, message: `Mock ${parsed.data}` },
    },
  ];
}

export { mockErrorChunks };
