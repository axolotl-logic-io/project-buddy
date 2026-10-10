import { unstable_rethrow } from "next/navigation";
import { AppError } from "@/errors/app-error.ts";
import { classifyError } from "@/errors/classify-error.ts";
import { describeError } from "@/errors/describe-error.ts";

// How many links of an error's cause chain are searched for Next's
// control-flow errors.
const MAX_CAUSE_DEPTH = 5;

// The next link of an error chain: Neon keeps the original error in
// `sourceError`, everything else in `cause`.
function nextErrorLink(link: object): unknown {
  if (
    "sourceError" in link &&
    link.sourceError !== undefined &&
    link.sourceError !== null
  ) {
    return link.sourceError;
  }
  if ("cause" in link) {
    return link.cause;
  }
  return undefined;
}

// Next uses errors for control flow, such as rejecting fetch() when a prerender
// finishes. They must reach Next untouched and are not failures. Next's
// unstable_rethrow follows `cause`; Neon keeps the original in `sourceError`.
function rethrowNextControlFlow(error: unknown): void {
  let link = error;
  for (let depth = 0; depth < MAX_CAUSE_DEPTH; depth += 1) {
    if (typeof link !== "object" || link === null) {
      return;
    }
    unstable_rethrow(link);
    link = nextErrorLink(link);
  }
}

// The error factory. It turns any thrown value into an AppError and logs the
// original with its case. An AppError passes through unlogged, since it was
// logged where it was made.
export function toAppError(error: unknown, operation: string): AppError {
  if (error instanceof AppError) {
    return error;
  }
  const appError = new AppError(classifyError(error), error);
  console.error(
    `[app-error] ${appError.errorCase} in ${operation}`,
    JSON.stringify(describeError(error)),
  );
  return appError;
}

// Runs a call to an external API so that any failure becomes a logged AppError.
export async function withAppErrors<T>(
  operation: string,
  call: () => Promise<T>,
): Promise<T> {
  try {
    return await call();
  } catch (error) {
    rethrowNextControlFlow(error);
    throw toAppError(error, operation);
  }
}
