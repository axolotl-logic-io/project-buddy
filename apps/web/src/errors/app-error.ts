// A failure reaches the browser by its case name.
const APP_ERROR_CASES = [
  "database-unreachable",
  "database-query-failed",
  "signed-out",
  "not-found",
  "unknown",
] as const;

type AppErrorCase = (typeof APP_ERROR_CASES)[number];

// Static text shown to the user, never the upstream message.
const USER_MESSAGES: Readonly<Record<AppErrorCase, string>> = {
  "database-unreachable":
    "The database can't be reached right now. Try again in a few minutes.",
  "database-query-failed":
    "Your changes could not be saved. Please try again later.",
  "signed-out": "You have been signed out. Sign in again to continue.",
  "not-found":
    "That quest or performance can't be found. The link may be wrong, or the quest isn't open to you.",
  unknown: "Something went wrong. Please try again later.",
};

// The case that text from the server names: a response body or an error's digest. Any other text, such as a raw upstream
// message or a digest Next made, is the unknown case.
function readAppErrorCase(text: string | undefined): AppErrorCase {
  return APP_ERROR_CASES.find((errorCase) => errorCase === text) ?? "unknown";
}

// A case name in form: lowercase words joined by hyphens.
const CASE_NAME_FORM = /^[a-z]+(?:-[a-z]+)*$/u;

// Whether the first line of text from the server is in a case name's form
// but names no case this build knows, as when a newer build sent it during a
// deploy. Any other text, "unknown" included, is not.
function isUnrecognisedCaseName(text: string | undefined): boolean {
  const firstLine = text?.split("\n", 1)[0] ?? "";
  return (
    CASE_NAME_FORM.test(firstLine) &&
    firstLine !== "unknown" &&
    readAppErrorCase(firstLine) === "unknown"
  );
}

// The message to show the user for a case.
function userMessage(errorCase: AppErrorCase): string {
  return USER_MESSAGES[errorCase];
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
  appErrorResponse,
  isUnrecognisedCaseName,
  readAppErrorCase,
  userMessage,
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
