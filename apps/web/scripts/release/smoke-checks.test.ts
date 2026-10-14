// @vitest-environment node
import { expect, test } from "vitest";
import {
  type SmokeFetch,
  smokeChecks,
  withProtectionBypass,
} from "./smoke-checks.ts";

const BASE_URL = "https://project-buddy.example";

interface FakeAnswer {
  readonly status: number;
  readonly body?: string;
  readonly location?: string;
}

type FakeAnswers = Readonly<Record<string, FakeAnswer>>;

// The answers the live site gives when it is healthy, by "METHOD path".
const HEALTHY: FakeAnswers = {
  "GET /login": { status: 200, body: "<h1>Sign in</h1>" },
  "GET /signup": { status: 200, body: "<label>Invite code</label>" },
  "GET /": { status: 307, location: "/login" },
  "POST /api/chat": { status: 401, body: '{"case":"signed-out"}' },
};

const CHECKED_URLS: readonly string[] = [
  `${BASE_URL}/login`,
  `${BASE_URL}/signup`,
  `${BASE_URL}/`,
  `${BASE_URL}/api/chat`,
];

interface FakeRequest {
  readonly url: string;
  readonly init: RequestInit;
}

interface FakeSite {
  readonly fetch: SmokeFetch;
  readonly requests: FakeRequest[];
}

// A fetch that answers from answers, and records each request.
function fakeSite(answers: FakeAnswers): FakeSite {
  const requests: FakeRequest[] = [];
  const fakeFetch: SmokeFetch = (url: string, init: RequestInit) => {
    requests.push({ url, init });
    const key = `${init.method ?? "GET"} ${new URL(url).pathname}`;
    const answer = answers[key];
    if (answer === undefined) {
      return Promise.reject(new Error(`no answer for ${key}`));
    }
    const headers = new Headers();
    if (answer.location !== undefined) {
      headers.set("location", answer.location);
    }
    return Promise.resolve(
      new Response(answer.body ?? null, { status: answer.status, headers }),
    );
  };
  return { requests, fetch: fakeFetch };
}

// The healthy site, except that key answers answer, or fails if undefined.
function siteWith(key: string, answer: FakeAnswer | undefined): FakeAnswers {
  const answers: Record<string, FakeAnswer> = { ...HEALTHY };
  if (answer === undefined) {
    delete answers[key];
  } else {
    answers[key] = answer;
  }
  return answers;
}

test("smokeChecks passes a healthy site without following redirects", async () => {
  const site = fakeSite(HEALTHY);

  await expect(smokeChecks(BASE_URL, site.fetch)).resolves.toEqual([]);
  expect(site.requests.map(({ url }) => url)).toEqual(CHECKED_URLS);
  for (const { init } of site.requests) {
    expect(init.redirect).toBe("manual");
  }
  expect(site.requests.at(-1)?.init).toMatchObject({
    method: "POST",
    body: "{}",
  });
});

test("smokeChecks accepts an absolute redirect to /login", async () => {
  const site = fakeSite(
    siteWith("GET /", { status: 307, location: `${BASE_URL}/login` }),
  );

  await expect(smokeChecks(BASE_URL, site.fetch)).resolves.toEqual([]);
});

test.each([
  ["GET /login", { status: 500 }, "GET /login: answered 500, expected 200"],
  ["GET /signup", { status: 404 }, "GET /signup: answered 404, expected 200"],
  [
    "GET /signup",
    { status: 200, body: "<label>Passphrase</label>" },
    'GET /signup: the page does not contain "invite code"',
  ],
  ["GET /", { status: 200 }, "GET /: answered 200, expected 307"],
  [
    "GET /",
    { status: 308, location: "/login" },
    "GET /: answered 308, expected 307",
  ],
  ["GET /", { status: 307 }, "GET /: redirected with no Location header"],
  [
    "GET /",
    { status: 307, location: "/elsewhere" },
    "GET /: redirected to /elsewhere, expected /login",
  ],
  [
    "POST /api/chat",
    { status: 200 },
    "POST /api/chat: answered 200, expected 401",
  ],
  [
    "POST /api/chat",
    { status: 500 },
    "POST /api/chat: answered 500, expected 401",
  ],
  [
    "POST /api/chat",
    undefined,
    "POST /api/chat: request failed: no answer for POST /api/chat",
  ],
] as const)(
  "smokeChecks reports %s answering %o",
  async (key, answer, failure) => {
    const site = fakeSite(siteWith(key, answer));

    await expect(smokeChecks(BASE_URL, site.fetch)).resolves.toEqual([failure]);
  },
);

test("smokeChecks reports every failing check", async () => {
  const site = fakeSite({});

  const failures = await smokeChecks(BASE_URL, site.fetch);

  expect(failures).toHaveLength(CHECKED_URLS.length);
});

test("withProtectionBypass adds the bypass header and keeps the others", async () => {
  const seen: RequestInit[] = [];
  const fetchFn: SmokeFetch = (_url: string, init: RequestInit) => {
    seen.push(init);
    return Promise.resolve(new Response(null, { status: 200 }));
  };

  await withProtectionBypass(fetchFn, "s3cret")(`${BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
  });

  const headers = new Headers(seen[0]?.headers);
  expect(headers.get("x-vercel-protection-bypass")).toBe("s3cret");
  expect(headers.get("content-type")).toBe("application/json");
  expect(seen[0]?.method).toBe("POST");
});

test("withProtectionBypass leaves requests alone without a secret", () => {
  const fetchFn: SmokeFetch = () => Promise.resolve(new Response(null));

  expect(withProtectionBypass(fetchFn, undefined)).toBe(fetchFn);
  expect(withProtectionBypass(fetchFn, "")).toBe(fetchFn);
});
