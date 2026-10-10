// The ways a call to Anthropic (through the AI SDK) or to Neon Postgres
// (through drizzle and the Neon HTTP driver) can fail.
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
  "unknown",
] as const;

type AppErrorCase = (typeof APP_ERROR_CASES)[number];

const APP_ERROR_CASE_SET: ReadonlySet<string> = new Set<string>(
  APP_ERROR_CASES,
);

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
  unknown:
    "Something went wrong. Try again, and check the server logs if it keeps failing.",
};

function isAppErrorCase(value: string): value is AppErrorCase {
  return APP_ERROR_CASE_SET.has(value);
}

export { APP_ERROR_CASES, type AppErrorCase };

export class AppError extends Error {
  readonly errorCase: AppErrorCase;

  constructor(errorCase: AppErrorCase, cause: unknown) {
    super(USER_MESSAGES[errorCase], { cause });
    this.name = "AppError";
    this.errorCase = errorCase;
  }
}

// The server sends only the case to the browser; any other text, such as a
// raw upstream message, shows the unknown message.
export function userMessageForCase(errorCase: string): string {
  if (isAppErrorCase(errorCase)) {
    return USER_MESSAGES[errorCase];
  }
  return USER_MESSAGES.unknown;
}
