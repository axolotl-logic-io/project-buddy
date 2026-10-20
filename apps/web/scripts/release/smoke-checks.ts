// The release and integration workflows' smoke test: a few
// signed-out requests to the live site that show the new build is serving.
// Only GET requests and one signed-out POST, so it never writes to the
// database or calls Claude. Imports use relative paths so Node can run it
// directly, without the app's alias resolver.
import { SETUP_COPY } from "../../src/ui/copy/invitations.ts";
import { SIGNUP_COPY } from "../../src/ui/copy/signup.ts";

// The part of fetch the checks use, so a test can pass a fake.
type SmokeFetch = (url: string, init: RequestInit) => Promise<Response>;

const OK = 200;
const TEMPORARY_REDIRECT = 307;
const UNAUTHORIZED = 401;
const NON_PAGE_CONTENT =
  /<!--[\s\S]*?-->|<script\b[^>]*>[\s\S]*?<\/script\s*>|<style\b[^>]*>[\s\S]*?<\/style\s*>/giu;
const ANCHOR = /<a\b(?<attributes>[^>]*)>(?<label>[\s\S]*?)<\/a\s*>/giu;
const LOGIN_HREF = /(?:^|\s)href\s*=\s*(?:"\/login"|'\/login')(?=\s|$)/u;

// React escapes text in the server-rendered HTML, including shared copy.
function htmlText(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#x27;");
}

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

async function checkInvitationPage(
  response: Response,
  explanation: string,
  signIn: string,
): Promise<string | undefined> {
  const problem = statusProblem(response, OK);
  if (problem !== undefined) {
    return problem;
  }
  // Serialized data, styles and comments do not provide page UI, even
  // when they contain the same copy or markup as the expected elements.
  const body = (await response.text()).replaceAll(NON_PAGE_CONTENT, "");
  if (!body.includes(htmlText(explanation))) {
    return `the page does not contain "${explanation}"`;
  }
  // Check the label and destination on the same anchor, not independent
  // occurrences (for example in Next's serialized component payload).
  for (const { groups } of body.matchAll(ANCHOR)) {
    const { attributes, label } = groups ?? {};
    if (
      LOGIN_HREF.test(attributes ?? "") &&
      label?.trim() === htmlText(signIn)
    ) {
      return;
    }
  }
  return `the page does not offer a "${signIn}" link to /login`;
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
  {
    name: "GET /signup",
    path: "/signup",
    init: {},
    check: (response: Response): Promise<string | undefined> =>
      checkInvitationPage(response, SIGNUP_COPY.intro, SIGNUP_COPY.signInLink),
  },
  {
    // No token: the unusable state rejects it before an invitation query.
    name: "GET /setup",
    path: "/setup",
    init: {},
    check: (response: Response): Promise<string | undefined> =>
      checkInvitationPage(response, SETUP_COPY.unusable, SETUP_COPY.signIn),
  },
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
function smokeChecks(baseUrl: string, fetchFn: SmokeFetch): Promise<string[]> {
  // Chain requests instead of starting them all together: the live site
  // receives one at a time, including reading and checking each response.
  return CHECKS.reduce(
    async (pending, { name, path, init, check }): Promise<string[]> => {
      const failures = await pending;
      const url = new URL(path, baseUrl).href;
      let problem: string | undefined;
      try {
        const response = await fetchFn(url, { ...init, redirect: "manual" });
        problem = await check(response, baseUrl);
      } catch (error) {
        problem = `request failed: ${describeError(error)}`;
      }
      if (problem !== undefined) {
        failures.push(`${name}: ${problem}`);
      }
      return failures;
    },
    Promise.resolve<string[]>([]),
  );
}

// Vercel's Deployment Protection answers a preview URL with a redirect to its
// login unless the request carries the project's automation bypass secret.
// Without a secret, requests go out unchanged.
function withProtectionBypass(
  fetchFn: SmokeFetch,
  secret: string | undefined,
): SmokeFetch {
  if (secret === undefined || secret === "") {
    return fetchFn;
  }
  return (url: string, init: RequestInit): Promise<Response> => {
    const headers = new Headers(init.headers);
    headers.set("x-vercel-protection-bypass", secret);
    return fetchFn(url, { ...init, headers });
  };
}

export type { SmokeFetch };
export { smokeChecks, withProtectionBypass };
