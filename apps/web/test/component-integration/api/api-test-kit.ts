// For server tests of the /api/v1 routes: calls a route handler as Next
// does, with the test's session cookie, and reads its JSON answer.

const API_ORIGIN = "http://localhost/api/v1";

// A route handler as a route file exports it.
type Handler<Params> = (
  request: Request,
  context: { params: Promise<Params> },
) => Promise<Response>;

// What a route answered: its status and its JSON body.
interface ApiAnswer {
  readonly status: number;
  readonly body: Record<string, unknown>;
}

// What to send: the path's parameters, a query and a JSON body.
interface ApiCallInit<Params> {
  readonly params: Params;
  readonly query?: string;
  readonly body?: unknown;
  // The method, which the handler ignores but a request needs for a body.
  readonly method?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Calls handler with init, as Next would for a request under /api/v1.
async function callApi<Params>(
  handler: Handler<Params>,
  init: ApiCallInit<Params>,
): Promise<ApiAnswer> {
  let requestInit: RequestInit = { method: init.method ?? "GET" };
  if (init.body !== undefined) {
    requestInit = {
      method: init.method ?? "POST",
      body: JSON.stringify(init.body),
      headers: { "content-type": "application/json" },
    };
  }
  const response = await handler(
    new Request(`${API_ORIGIN}?${init.query ?? ""}`, requestInit),
    { params: Promise.resolve(init.params) },
  );
  const body: unknown = await response.json();
  if (!isRecord(body)) {
    throw new Error("The API answered with something other than an object");
  }
  return { status: response.status, body };
}

// The record an answer carries as its data.
function dataOf(answer: ApiAnswer): Record<string, unknown> {
  const { data } = answer.body;
  if (!isRecord(data)) {
    throw new Error(`The API answered ${answer.status} without data`);
  }
  return data;
}

// The id of the first item an answer lists.
function firstItemId(answer: ApiAnswer): string {
  const { items } = answer.body;
  if (!Array.isArray(items)) {
    throw new Error(`The API answered ${answer.status} without items`);
  }
  const [first]: unknown[] = items;
  if (!isRecord(first)) {
    throw new Error("The first item isn't a record");
  }
  const { id } = first;
  if (typeof id !== "string") {
    throw new Error("The first item has no id");
  }
  return id;
}

export type { ApiAnswer };
export { callApi, dataOf, firstItemId };
