// Errors shaped the way the AI SDK, the Neon driver and drizzle build them,
// for the error-handling tests.
import { NeonDbError } from "@neondatabase/serverless";
import { APICallError, StreamProviderError } from "ai";
import { DrizzleQueryError } from "drizzle-orm";

export const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
export const REQUEST_ID = "req_011CTest";

// An APICallError as @ai-sdk/anthropic builds it from a failed HTTP response:
// the parsed body becomes `data` and its error message the error's message.
export function anthropicHttpError(
  statusCode: number,
  type: string,
  message: string,
  isRetryable = false,
): APICallError {
  const body = { type: "error", error: { type, message } };
  return new APICallError({
    message,
    url: ANTHROPIC_URL,
    requestBodyValues: { model: "claude-sonnet-5-5", messages: [] },
    statusCode,
    responseHeaders: {
      "request-id": REQUEST_ID,
      "content-type": "application/json",
    },
    responseBody: JSON.stringify(body),
    data: body,
    isRetryable,
  });
}

// An error event inside Anthropic's response stream, as the AI SDK reports it.
export function anthropicStreamError(
  type: string,
  message: string,
  statusCode: number,
): StreamProviderError {
  return new StreamProviderError({
    message,
    type,
    statusCode,
    data: { type, message },
  });
}

// The Neon HTTP driver puts Postgres error fields on NeonDbError; drizzle
// wraps it in DrizzleQueryError with the query and its parameters.
export function postgresError(
  code: string,
  message: string,
): DrizzleQueryError {
  const error = new NeonDbError(message);
  error.code = code;
  error.severity = "ERROR";
  return new DrizzleQueryError(
    'select "id" from "chats" where "chats"."id" = $1',
    ["not-a-uuid"],
    error,
  );
}

// What drizzle throws when the Neon driver cannot reach its endpoint.
export function neonFetchFailure(): DrizzleQueryError {
  const fetchError = new TypeError("fetch failed");
  const error = new NeonDbError(
    `Error connecting to database: ${String(fetchError)}`,
  );
  error.sourceError = fetchError;
  return new DrizzleQueryError("select 1", [], error);
}
