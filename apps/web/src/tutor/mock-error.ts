// "/mock-error <Anthropic error type>" makes the mock tutor fail the way
// Claude's response stream does when Anthropic sends that error event, such
// as `/mock-error overloaded_error`, so end-to-end tests can drive a failed
// reply through the real error path. An error type Anthropic doesn't have
// gets a text reply saying so, and no failure.
import { z } from "zod";
import type { MockStep } from "@/tutor/mock-script.ts";

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

// The reply to /mock-error: one step that fails at once with the error event
// that errorType names.
function mockErrorReply(errorType: string): MockStep[] {
  const parsed = ANTHROPIC_ERROR_TYPE.safeParse(errorType);
  if (!parsed.success) {
    return [
      {
        text: `The mock tutor needs \`/mock-error <type>\`, with one of Anthropic's error types: ${ANTHROPIC_ERROR_TYPE.options.join(", ")}.`,
        toolCalls: [],
      },
    ];
  }
  return [
    {
      text: "",
      error: { type: parsed.data, message: `Mock ${parsed.data}` },
    },
  ];
}

export { mockErrorReply };
