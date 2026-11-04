// Checks that a Server Action or page called Next's `redirect()` or
// `notFound()`. Both work by throwing an error Next recognizes, so each
// check passes only if the action rejects with that error. This is the one
// module that knows how Next marks those errors.
import {
  getAccessFallbackHTTPStatus,
  isHTTPAccessFallbackError,
} from "next/dist/client/components/http-access-fallback/http-access-fallback.js";
import { getURLFromRedirectError } from "next/dist/client/components/redirect.js";
import { isRedirectError } from "next/dist/client/components/redirect-error.js";
import { HTTP_STATUS } from "@/http-status.ts";

// How an action ended: it resolved, or it threw error.
type Outcome =
  | { readonly threw: false }
  | { readonly threw: true; readonly error: unknown };

// Runs action, sync or async, to its outcome.
async function settle(action: () => unknown): Promise<Outcome> {
  try {
    await action();
  } catch (error) {
    return { threw: true, error };
  }
  return { threw: false };
}

// Passes only if action redirects to the path and optional query fields.
async function expectRedirect(
  action: () => unknown,
  path: string,
  query?: Record<string, string>,
): Promise<void> {
  let destination = path;
  if (query !== undefined) {
    destination = `${path}?${new URLSearchParams(query)}`;
  }
  const outcome = await settle(action);
  if (!outcome.threw) {
    throw new Error(
      `Expected a redirect to ${destination}, but the action resolved`,
    );
  }
  if (!isRedirectError(outcome.error)) {
    throw new Error(`Expected a redirect to ${destination}`, {
      cause: outcome.error,
    });
  }
  const url = getURLFromRedirectError(outcome.error);
  if (url !== destination) {
    throw new Error(`Expected a redirect to ${destination}, not to ${url}`);
  }
}

// Passes only if action answers not found, as `notFound()` does.
async function expectNotFound(action: () => unknown): Promise<void> {
  const outcome = await settle(action);
  if (!outcome.threw) {
    throw new Error("Expected the action to be not found, but it resolved");
  }
  if (
    !isHTTPAccessFallbackError(outcome.error) ||
    getAccessFallbackHTTPStatus(outcome.error) !== HTTP_STATUS.notFound
  ) {
    throw new Error("Expected the action to be not found", {
      cause: outcome.error,
    });
  }
}

export { expectNotFound, expectRedirect };
