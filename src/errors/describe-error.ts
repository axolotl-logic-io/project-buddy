import { APICallError, RetryError, StreamProviderError } from "ai";
import { DrizzleQueryError } from "drizzle-orm";
import { anthropicErrorType, isNeonDbError } from "@/errors/upstream-errors.ts";

type ErrorDetails = Readonly<Record<string, unknown>>;

const MAX_DESCRIBED_DEPTH = 4;
const MAX_LOGGED_BODY_LENGTH = 2000;

function apiCallErrorDetails(error: Error): ErrorDetails {
  if (!APICallError.isInstance(error)) {
    return {};
  }
  return {
    url: error.url,
    statusCode: error.statusCode,
    isRetryable: error.isRetryable,
    type: anthropicErrorType(error.data),
    requestId: error.responseHeaders?.["request-id"],
    responseBody: error.responseBody?.slice(0, MAX_LOGGED_BODY_LENGTH),
  };
}

function streamProviderErrorDetails(error: Error): ErrorDetails {
  if (!StreamProviderError.isInstance(error)) {
    return {};
  }
  return {
    statusCode: error.statusCode,
    type: error.type,
    code: error.code,
    isRetryable: error.isRetryable,
  };
}

function retryErrorDetails(error: Error, depth: number): ErrorDetails {
  if (!RetryError.isInstance(error)) {
    return {};
  }
  return {
    reason: error.reason,
    errors: error.errors.map((attempt) => describeError(attempt, depth + 1)),
  };
}

function neonDbErrorDetails(error: Error, depth: number): ErrorDetails {
  if (!isNeonDbError(error)) {
    return {};
  }
  return {
    code: error.code,
    severity: error.severity,
    detail: error.detail,
    hint: error.hint,
    sourceError: describeSourceError(error.sourceError, depth),
  };
}

function describeSourceError(
  sourceError: Error | undefined,
  depth: number,
): unknown {
  if (sourceError === undefined) {
    return undefined;
  }
  return describeError(sourceError, depth + 1);
}

// Any other error's own `code`, such as Node's "UND_ERR_SOCKET".
function codeDetails(error: Error, details: ErrorDetails): ErrorDetails {
  const { code } = details;
  if (code !== undefined || !("code" in error)) {
    return {};
  }
  return { code: error.code };
}

function causeDetails(error: Error, depth: number): ErrorDetails {
  if (error.cause === undefined) {
    return {};
  }
  return { cause: describeError(error.cause, depth + 1) };
}

// The fields worth logging from an error and its causes. It leaves out the
// model request body (the whole prompt), request and response headers other
// than the request id, and drizzle's query parameters.
export function describeError(error: unknown, depth = 0): ErrorDetails {
  if (!(error instanceof Error)) {
    return { value: String(error) };
  }
  if (depth > MAX_DESCRIBED_DEPTH) {
    return { name: error.name, message: error.message };
  }
  if (error instanceof DrizzleQueryError) {
    return {
      name: "DrizzleQueryError",
      query: error.query,
      cause: describeError(error.cause, depth + 1),
    };
  }
  const details: ErrorDetails = {
    name: error.name,
    message: error.message,
    ...apiCallErrorDetails(error),
    ...streamProviderErrorDetails(error),
    ...retryErrorDetails(error, depth),
    ...neonDbErrorDetails(error, depth),
  };
  return {
    ...details,
    ...codeDetails(error, details),
    ...causeDetails(error, depth),
  };
}
