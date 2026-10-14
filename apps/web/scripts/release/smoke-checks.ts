// The release workflow's smoke test (.github/workflows/release.yml): a few
// signed-out requests to the live site that show the new build is serving.
// Only GET requests and one signed-out POST, so it never writes to the
// database or calls Claude. Node runs this file directly, so it imports
// nothing.

// The part of fetch the checks use, so a test can pass a fake.
type SmokeFetch = (url: string, init: RequestInit) => Promise<Response>;

const OK = 200;
const TEMPORARY_REDIRECT = 307;
const UNAUTHORIZED = 401;
const INVITE_CODE = /invite code/iu;

// One request and what its answer must be: the check returns undefined if
// the answer passes, or what was wrong with it.
interface SmokeCheck {
  readonly name: string;
  readonly path: string;
  readonly init: RequestInit;
  readonly check: (
    response: Response,
    baseUrl: string,
  ) => Promise<string | undefined>;
}

function statusProblem(
  response: Response,
  expected: number,
): string | undefined {
  if (response.status === expected) {
    return;
  }
  return `answered ${response.status}, expected ${expected}`;
}

function checkLogin(response: Response): Promise<string | undefined> {
  return Promise.resolve(statusProblem(response, OK));
}

async function checkSignup(response: Response): Promise<string | undefined> {
  const problem = statusProblem(response, OK);
  if (problem !== undefined) {
    return problem;
  }
  const body = await response.text();
  if (INVITE_CODE.test(body)) {
    return;
  }
  return 'the page does not contain "invite code"';
}

function checkHome(
  response: Response,
  baseUrl: string,
): Promise<string | undefined> {
  const problem = statusProblem(response, TEMPORARY_REDIRECT);
  if (problem !== undefined) {
    return Promise.resolve(problem);
  }
  const location = response.headers.get("location");
  if (location === null) {
    return Promise.resolve("redirected with no Location header");
  }
  if (new URL(location, baseUrl).pathname === "/login") {
    return Promise.resolve(undefined);
  }
  return Promise.resolve(`redirected to ${location}, expected /login`);
}

function checkChat(response: Response): Promise<string | undefined> {
  return Promise.resolve(statusProblem(response, UNAUTHORIZED));
}

const CHECKS: readonly SmokeCheck[] = [
  { name: "GET /login", path: "/login", init: {}, check: checkLogin },
  { name: "GET /signup", path: "/signup", init: {}, check: checkSignup },
  { name: "GET /", path: "/", init: {}, check: checkHome },
  {
    name: "POST /api/chat",
    path: "/api/chat",
    init: {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    },
    check: checkChat,
  },
];

function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

// Runs every check against the site at baseUrl and returns the failures, one
// line each, or an empty list if all pass. Redirects are not followed, so a
// redirect is checked as the answer itself.
async function smokeChecks(
  baseUrl: string,
  fetchFn: SmokeFetch,
): Promise<string[]> {
  const failures: string[] = [];
  for (const { name, path, init, check } of CHECKS) {
    const url = new URL(path, baseUrl).href;
    let problem: string | undefined;
    try {
      // One request at a time, so the live site sees no burst.
      // biome-ignore lint/performance/noAwaitInLoops: sequential on purpose
      const response = await fetchFn(url, { ...init, redirect: "manual" });
      problem = await check(response, baseUrl);
    } catch (error) {
      problem = `request failed: ${describeError(error)}`;
    }
    if (problem !== undefined) {
      failures.push(`${name}: ${problem}`);
    }
  }
  return failures;
}

export type { SmokeFetch };
export { smokeChecks };
