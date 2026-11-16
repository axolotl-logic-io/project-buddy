// The failures the command-line interface reports, as the API reports them
// or as the CLI finds them itself, and the exit status of each.

// A failure: a stable code, a message for people, whether the same request
// may succeed if sent again later and, when one input was wrong, which.
interface Problem {
  readonly code: string;
  readonly message: string;
  readonly retryable: boolean;
  readonly field?: string | undefined;
}

// An input the CLI rejects before it sends anything, thrown from deep in
// argument reading and reported as an invalid_input problem.
class InputProblem extends Error {
  readonly field: string | undefined;

  constructor(
    message: string,
    {
      field,
      cause,
    }: {
      readonly field?: string | undefined;
      readonly cause?: unknown;
    } = {},
  ) {
    super(message, { cause });
    this.name = "InputProblem";
    this.field = field;
  }
}

const EXIT_STATUS = {
  ok: 0,
  failure: 1,
  invalidInput: 2,
  authorization: 3,
  permission: 4,
  notFound: 5,
  conflict: 6,
  rateLimited: 7,
  network: 8,
  interrupted: 130,
} as const;

// The exit status of a failure.
type FailureStatus = Exclude<
  (typeof EXIT_STATUS)[keyof typeof EXIT_STATUS],
  typeof EXIT_STATUS.ok
>;

// The exit status of a problem's code. A code the CLI doesn't know is an
// unexpected failure.
function exitStatusOf(code: string): FailureStatus {
  switch (code) {
    case "invalid_input":
      return EXIT_STATUS.invalidInput;
    case "authorization_required":
      return EXIT_STATUS.authorization;
    case "permission_denied":
      return EXIT_STATUS.permission;
    case "not_found":
      return EXIT_STATUS.notFound;
    case "conflict":
    case "reply_in_progress":
      return EXIT_STATUS.conflict;
    case "rate_limited":
      return EXIT_STATUS.rateLimited;
    case "network_error":
    case "timeout":
    case "outcome_unknown":
      return EXIT_STATUS.network;
    case "interrupted":
      return EXIT_STATUS.interrupted;
    default:
      return EXIT_STATUS.failure;
  }
}

// A problem with the invocation itself, found before any request.
function invalidInput(message: string, field?: string): Problem {
  return { code: "invalid_input", message, retryable: false, field };
}

export type { Problem };
export { EXIT_STATUS, exitStatusOf, InputProblem, invalidInput };
