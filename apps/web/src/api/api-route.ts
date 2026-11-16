// The boundary of the versioned API under /api/v1, which the command-line
// interface calls. It hides the wire format: every answer is JSON, either
// `{ data }` for one record, `{ items, ...meta }` for a list, or
// `{ error: { code, message, retryable, field? } }` with the status its code
// names. A route handler is a thin adapter: it reads its input here and
// calls the domain stores, which check access, as the site's Server Actions
// do. The caller is the signed-in user of the request's session cookie, so a
// request without one answers 401 and never a redirect.

import type { z } from "zod";
import type { User } from "@/accounts/users-store.ts";
import { currentUser } from "@/auth/current-user.ts";
import { AppError, type AppErrorCase } from "@/errors/app-error.ts";
import { toAppError } from "@/errors/to-app-error.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { getQuest, type Quest } from "@/quests/store.ts";

// The error codes the API answers with.
const API_PROBLEM_CODES = [
  "invalid_input",
  "authorization_required",
  "not_found",
  "conflict",
  "reply_in_progress",
  "rate_limited",
  "reply_failed",
  "server_error",
] as const;

type ApiProblemCode = (typeof API_PROBLEM_CODES)[number];

// A problem's status, and whether the same request may succeed if sent
// again later.
interface ProblemKind {
  readonly status: number;
  readonly retryable: boolean;
}

function problemKind(code: ApiProblemCode): ProblemKind {
  switch (code) {
    case "invalid_input":
      return { status: HTTP_STATUS.badRequest, retryable: false };
    case "authorization_required":
      return { status: HTTP_STATUS.unauthorized, retryable: false };
    case "not_found":
      return { status: HTTP_STATUS.notFound, retryable: false };
    case "conflict":
      return { status: HTTP_STATUS.conflict, retryable: false };
    case "reply_in_progress":
      return { status: HTTP_STATUS.conflict, retryable: true };
    case "rate_limited":
      return { status: HTTP_STATUS.tooManyRequests, retryable: true };
    case "reply_failed":
      return { status: HTTP_STATUS.badGateway, retryable: true };
    case "server_error":
      return { status: HTTP_STATUS.internalServerError, retryable: true };
    default:
      return code satisfies never;
  }
}

// A failure as the API answers with it.
interface ProblemBody {
  readonly code: ApiProblemCode;
  readonly message: string;
  readonly retryable: boolean;
  readonly field?: string;
}

// What a route handler gets: the signed-in user, the request and its
// path's parameters.
interface ApiCall<Params> {
  readonly user: User;
  readonly request: Request;
  readonly params: Params;
}

// A call to a route under a quest, with the quest, which is open to the user.
interface QuestCall<Params> extends ApiCall<Params> {
  readonly quest: Quest;
}

// The path parameters of a route without any.
type NoParams = Record<string, never>;

// The path parameters of a route under /quests/[questId].
interface QuestParams {
  readonly questId: string;
}

// The context Next passes a route handler.
interface RouteContextOf<Params> {
  readonly params: Promise<Params>;
}

type RouteHandler<Params> = (
  request: Request,
  context: RouteContextOf<Params>,
) => Promise<Response>;

const NOT_FOUND_MESSAGE =
  "No such record is open to you. The id may be wrong, or the quest isn't shared with you.";

// The problems a failure the stores raise can answer with.
type CaseProblemCode = Extract<
  ApiProblemCode,
  | "not_found"
  | "reply_in_progress"
  | "rate_limited"
  | "authorization_required"
  | "server_error"
>;

// The problem a failure the stores raise answers with.
function problemOfCase(errorCase: AppErrorCase): CaseProblemCode {
  switch (errorCase) {
    case "not-found":
      return "not_found";
    case "already-answered":
      return "reply_in_progress";
    case "rate-limited":
      return "rate_limited";
    case "signed-out":
      return "authorization_required";
    default:
      return "server_error";
  }
}

// One record.
function apiData(data: unknown): Response {
  return Response.json({ data });
}

// A list, in its domain's order, with anything else the list has, such as
// the Tasks version.
function apiItems(
  items: readonly unknown[],
  meta: Readonly<Record<string, unknown>> = {},
): Response {
  return Response.json({ ...meta, items });
}

// A failure the caller can act on: its code, a message for people and,
// when one input was wrong, which.
function apiProblem(
  code: ApiProblemCode,
  message: string,
  field?: string,
): Response {
  const { status, retryable } = problemKind(code);
  let error: ProblemBody = { code, message, retryable };
  if (field !== undefined && field !== "") {
    error = { ...error, field };
  }
  return Response.json({ error }, { status });
}

// A record that is unknown, malformed or not open to the user: all the
// same to the caller.
function apiNotFound(): Response {
  return apiProblem("not_found", NOT_FOUND_MESSAGE);
}

// The input as schema reads it, or the problem to answer with: input that
// doesn't fit names the first wrong field.
function parseApiInput<Schema extends z.ZodType>(
  schema: Schema,
  input: unknown,
): z.infer<Schema> | Response {
  const parsed = schema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }
  const [issue] = parsed.error.issues;
  return apiProblem(
    "invalid_input",
    issue?.message ?? "The request is invalid.",
    issue?.path.join(".") ?? "",
  );
}

// The request's JSON body as schema reads it, or the problem to answer
// with: a body that isn't JSON, or doesn't fit.
async function readApiBody<Schema extends z.ZodType>(
  request: Request,
  schema: Schema,
): Promise<z.infer<Schema> | Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiProblem("invalid_input", "The request body must be JSON.");
  }
  return parseApiInput(schema, body);
}

// A route handler for the signed-in user. Any failure is logged once and
// answers with its problem, never an HTML page.
function apiRoute<Params>(
  handle: (call: ApiCall<Params>) => Promise<Response>,
): RouteHandler<Params> {
  return async (
    request: Request,
    context: RouteContextOf<Params>,
  ): Promise<Response> => {
    try {
      const user = await currentUser();
      if (user === undefined) {
        return apiProblem(
          "authorization_required",
          "Sign in again: the session is missing or has ended.",
        );
      }
      return await handle({ user, request, params: await context.params });
    } catch (error) {
      if (error instanceof AppError) {
        return apiProblem(problemOfCase(error.errorCase), error.message);
      }
      const appError = toAppError(error, "api request");
      return apiProblem(problemOfCase(appError.errorCase), appError.message);
    }
  };
}

// A route handler under /quests/[questId], for a quest open to the
// signed-in user; any other quest id is not found.
function questRoute<Params extends QuestParams>(
  handle: (call: QuestCall<Params>) => Promise<Response>,
): RouteHandler<Params> {
  return apiRoute(async (call: ApiCall<Params>): Promise<Response> => {
    const quest = await getQuest(call.user.id, call.params.questId);
    if (quest === undefined) {
      return apiNotFound();
    }
    return await handle({ ...call, quest });
  });
}

export type { ApiCall, ApiProblemCode, NoParams, QuestCall, QuestParams };
export {
  apiData,
  apiItems,
  apiNotFound,
  apiProblem,
  apiRoute,
  parseApiInput,
  questRoute,
  readApiBody,
};
