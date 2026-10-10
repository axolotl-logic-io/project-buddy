import type { NeonDbError } from "@neondatabase/serverless";

// The error type in Anthropic's error body, which the AI SDK keeps as `data`.
export function anthropicErrorType(data: unknown): string | undefined {
  if (typeof data !== "object" || data === null || !("error" in data)) {
    return undefined;
  }
  const { error } = data;
  if (typeof error !== "object" || error === null || !("type" in error)) {
    return undefined;
  }
  if (typeof error.type !== "string") {
    return undefined;
  }
  return error.type;
}

// Checked by name so this module stays free of the driver in client bundles.
export function isNeonDbError(error: unknown): error is NeonDbError {
  return error instanceof Error && error.name === "NeonDbError";
}
