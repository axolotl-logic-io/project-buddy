// Sends one request to the site's API under /api/v1, as the signed-in user
// of a session cookie, and reads its answer: the JSON body of a success, or
// the problem of a failure, whether the API, the network, the deadline or
// the caller ended it.

import { z } from "zod";
import type { Problem } from "./problems.ts";

type ApiMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

// One API call: its method, its path under /api/v1, any query and any JSON
// body.
interface ApiRequest {
  readonly method: ApiMethod;
  readonly path: string;
  readonly query?: Readonly<Record<string, string>>;
  readonly body?: unknown;
}

// Where and as whom requests go, and what ends them early: the caller's
// interrupt, or the deadline.
interface ApiConnection {
  readonly origin: URL;
  readonly session: string;
  readonly requestId: string;
  readonly fetch: typeof fetch;
  readonly interrupt: AbortSignal;
  readonly deadline: AbortSignal;
}

type ApiAnswer =
  | { readonly kind: "ok"; readonly body: Readonly<Record<string, unknown>> }
  | { readonly kind: "problem"; readonly problem: Problem };

const SESSION_COOKIE = "session";

const OK_BODY = z.record(z.string(), z.unknown());

const PROBLEM_BODY = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    retryable: z.boolean(),
    field: z.string().optional(),
  }),
});

const HTTP_UNAUTHORIZED = 401;

const SIGNED_OUT: Problem = {
  code: "authorization_required",
  message:
    "Sign in again: the session is missing or has ended. Set PROJECT_BUDDY_SESSION to a current session cookie.",
  retryable: false,
};

function problemAnswer(problem: Problem): ApiAnswer {
  return { kind: "problem", problem };
}

// The problem of a request the API never answered: interrupted, past its
// deadline, or lost on the network. A change that may have been made
// before the deadline is an unknown outcome.
function unansweredProblem(
  connection: ApiConnection,
  method: ApiMethod,
): Problem {
  if (connection.interrupt.aborted) {
    return {
      code: "interrupted",
      message: "Interrupted. The site may still finish the request.",
      retryable: true,
    };
  }
  if (connection.deadline.aborted && method !== "GET") {
    return {
      code: "outcome_unknown",
      message:
        "The deadline passed before the site answered; the change may or may not have been made. Read the record to check before you retry.",
      retryable: true,
    };
  }
  if (connection.deadline.aborted) {
    return {
      code: "timeout",
      message: "The deadline passed before the site answered.",
      retryable: true,
    };
  }
  return {
    code: "network_error",
    message: `Could not reach ${connection.origin.origin}. Check PROJECT_BUDDY_URL and that the site is running.`,
    retryable: true,
  };
}

// The answer a response's status and text make.
function answerOf(
  { status, ok }: Pick<Response, "status" | "ok">,
  text: string,
): ApiAnswer {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    if (status === HTTP_UNAUTHORIZED) {
      return problemAnswer(SIGNED_OUT);
    }
    return problemAnswer({
      code: "server_error",
      message: `The site answered ${status} without a JSON body.`,
      retryable: true,
    });
  }
  const problem = PROBLEM_BODY.safeParse(json);
  if (problem.success) {
    return problemAnswer(problem.data.error);
  }
  const body = OK_BODY.safeParse(json);
  if (body.success && ok) {
    return { kind: "ok", body: body.data };
  }
  return problemAnswer({
    code: "server_error",
    message: `The site answered ${status} with an unexpected body.`,
    retryable: true,
  });
}

function requestUrl(origin: URL, request: ApiRequest): URL {
  const url = new URL(`/api/v1${request.path}`, origin);
  for (const [name, value] of Object.entries(request.query ?? {})) {
    url.searchParams.set(name, value);
  }
  return url;
}

// Sends the request and reads its answer. It never throws.
async function callApi(
  connection: ApiConnection,
  request: ApiRequest,
): Promise<ApiAnswer> {
  const headers = new Headers({
    accept: "application/json",
    cookie: `${SESSION_COOKIE}=${connection.session}`,
    "x-request-id": connection.requestId,
  });
  let body: string | undefined;
  if (request.body !== undefined) {
    headers.set("content-type", "application/json");
    body = JSON.stringify(request.body);
  }
  try {
    const response = await connection.fetch(
      requestUrl(connection.origin, request),
      {
        method: request.method,
        headers,
        body: body ?? null,
        redirect: "manual",
        signal: AbortSignal.any([connection.interrupt, connection.deadline]),
      },
    );
    return answerOf(response, await response.text());
  } catch {
    return problemAnswer(unansweredProblem(connection, request.method));
  }
}

export type { ApiAnswer, ApiConnection, ApiMethod, ApiRequest };
export { callApi };
