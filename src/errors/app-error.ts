// What can go wrong, in the user's terms, and how a failure travels to the
// browser. A failure travels as its case name alone: as the body of a failed
// response, as a reply stream's error text, and as the `digest` of an error
// that reaches a Next error boundary. The browser and the proxy import this
// module, so it imports nothing.
const APP_ERROR_CASES = [
  "out-of-credits",
  "invalid-api-key",
  "rate-limited",
  "overloaded",
  "request-too-large",
  "invalid-request",
  "model-server-error",
  "model-unreachable",
  "database-unreachable",
  "database-query-failed",
  "signed-out",
  "not-found",
  "unknown",
] as const;

type AppErrorCase = (typeof APP_ERROR_CASES)[number];

// Static text shown to the user, never the upstream message.
const USER_MESSAGES: Readonly<Record<AppErrorCase, string>> = {
  "out-of-credits":
    "The Anthropic account is out of credits. Add credits in the Anthropic Console, then send your message again.",
  "invalid-api-key":
    "Anthropic rejected the site's API key, or the key is missing. Check ANTHROPIC_API_KEY in the Vercel project.",
  "rate-limited":
    "Too many requests to Claude right now. Wait a minute, then try again.",
  overloaded: "Claude is overloaded right now. Try again in a few minutes.",
  "request-too-large":
    "This chat is too long for Claude to read in one go. Start a new chat to continue.",
  "invalid-request":
    "Claude rejected the request. Try again, and check the server logs if it keeps failing.",
  "model-server-error":
    "Claude's service had an internal error. Try again in a few minutes.",
  "model-unreachable": "The site couldn't reach Claude. Try again in a moment.",
  "database-unreachable":
    "The database can't be reached right now. Try again in a few minutes.",
  "database-query-failed":
    "The database rejected a request. Check the server logs for details.",
  "signed-out": "You have been signed out. Sign in again to continue.",
  "not-found":
    "That project or chat can't be found. The link may be wrong, or it may have been deleted.",
  unknown:
    "Something went wrong. Try again, and check the server logs if it keeps failing.",
};

// The case that text from the server names: a response body, a stream's
// error text or an error's digest. Any other text, such as a raw upstream
// message or a digest Next made, is the unknown case.
function readAppErrorCase(text: string | undefined): AppErrorCase {
  return APP_ERROR_CASES.find((errorCase) => errorCase === text) ?? "unknown";
}

// The message to show for text from the server, read as readAppErrorCase
// reads it.
function userMessageForCase(text: string | undefined): string {
  return USER_MESSAGES[readAppErrorCase(text)];
}

// A failed response whose body is the case.
function appErrorResponse(errorCase: AppErrorCase, status: number): Response {
  return new Response(errorCase, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

export type { AppErrorCase };
export {
  APP_ERROR_CASES,
  appErrorResponse,
  readAppErrorCase,
  userMessageForCase,
};

// A failure with its case. The message is the case's static text, and the
// original error is the cause. `digest` holds the case name and nothing
// else: a production build hides a server error's message from error.tsx
// but passes on a digest the error already has, so the boundary can show the
// case's message. Next 16 keeps an existing digest as an implementation
// detail, not a documented promise; the end-to-end tests, which run the
// production build, check it.
export class AppError extends Error {
  readonly errorCase: AppErrorCase;
  readonly digest: AppErrorCase;

  constructor(errorCase: AppErrorCase, cause: unknown) {
    super(USER_MESSAGES[errorCase], { cause });
    this.name = "AppError";
    this.errorCase = errorCase;
    this.digest = errorCase;
  }
}
