// @vitest-environment node
import { expect, test } from "vitest";
import { SETUP_COPY } from "../../src/ui/copy/invitations.ts";
import { SIGNUP_COPY } from "../../src/ui/copy/signup.ts";
import {
  type SmokeFetch,
  smokeChecks,
  withProtectionBypass,
} from "./smoke-checks.ts";
import {
  BASE_URL,
  CHECKED_URLS,
  fakeSite,
  HEALTHY,
  invitationPage,
  siteWith,
} from "./smoke-test-kit.ts";

// Each failure's request, and the problem after it.
async function failuresOf(
  checking: Promise<string[]>,
): Promise<readonly { request: string; problem: string }[]> {
  return (await checking).map((failure) => {
    const [request = "", ...problem] = failure.split(": ");
    return { request, problem: problem.join(": ") };
  });
}

test("smokeChecks passes a healthy site without following redirects", async () => {
  const site = fakeSite(HEALTHY);

  await expect(smokeChecks(BASE_URL, site.fetch)).resolves.toEqual([]);
  expect(new Set(site.requests.map(({ url }) => url))).toEqual(
    new Set(CHECKED_URLS),
  );
  for (const { init } of site.requests) {
    expect(init.redirect).toBe("manual");
  }
});

test("smokeChecks accepts an absolute redirect to /login", async () => {
  const site = fakeSite(
    siteWith("GET /", { status: 307, location: `${BASE_URL}/login` }),
  );

  await expect(smokeChecks(BASE_URL, site.fetch)).resolves.toEqual([]);
});

test.each([
  ["GET /login", { status: 500 }, "500"],
  ["GET /signup", { status: 404 }, "404"],
  [
    "GET /signup",
    { status: 200, body: "<label>Invite code</label>" },
    SIGNUP_COPY.intro,
  ],
  [
    "GET /signup",
    { status: 200, body: invitationPage("", SIGNUP_COPY.signInLink) },
    SIGNUP_COPY.intro,
  ],
  [
    "GET /signup",
    { status: 200, body: `<p>${SIGNUP_COPY.intro}</p>` },
    SIGNUP_COPY.signInLink,
  ],
  [
    "GET /signup",
    {
      status: 200,
      body: invitationPage(
        SIGNUP_COPY.intro,
        SIGNUP_COPY.signInLink,
        "/elsewhere",
      ),
    },
    SIGNUP_COPY.signInLink,
  ],
  ["GET /setup", { status: 500 }, "500"],
  [
    "GET /setup",
    { status: 200, body: invitationPage("", SETUP_COPY.signIn) },
    SETUP_COPY.unusable,
  ],
  [
    "GET /setup",
    { status: 200, body: `<p>${SETUP_COPY.unusable}</p>` },
    SETUP_COPY.signIn,
  ],
  [
    "GET /setup",
    {
      status: 200,
      body: invitationPage(
        SETUP_COPY.unusable,
        SETUP_COPY.signIn,
        "/elsewhere",
      ),
    },
    SETUP_COPY.signIn,
  ],
  ["GET /", { status: 200 }, "200"],
  ["GET /", { status: 308, location: "/login" }, "308"],
  ["GET /", { status: 307 }, "Location"],
  ["GET /", { status: 307, location: "/elsewhere" }, "/elsewhere"],
  ["POST /api/chat", { status: 200 }, "200"],
  ["POST /api/chat", { status: 500 }, "500"],
  ["POST /api/chat", undefined, "no answer for POST /api/chat"],
] as const)(
  "smokeChecks reports %s answering %o",
  async (key, answer, named) => {
    const site = fakeSite(siteWith(key, answer));

    expect(await failuresOf(smokeChecks(BASE_URL, site.fetch))).toEqual([
      { request: key, problem: expect.stringContaining(named) },
    ]);
  },
);

test.each([
  ["GET /signup", SIGNUP_COPY.intro, SIGNUP_COPY.signInLink],
  ["GET /setup", SETUP_COPY.unusable, SETUP_COPY.signIn],
])(
  "%s needs the sign-in label and destination on the same link",
  async (key, intro, label) => {
    const site = fakeSite(
      siteWith(key, {
        status: 200,
        body: `${invitationPage(intro, label, "/elsewhere")}<a href="/login">Unrelated</a>`,
      }),
    );

    expect(await failuresOf(smokeChecks(BASE_URL, site.fetch))).toEqual([
      { request: key, problem: expect.stringContaining(label) },
    ]);
  },
);

test.each([
  ["GET /signup", SIGNUP_COPY.intro, SIGNUP_COPY.signInLink],
  ["GET /setup", SETUP_COPY.unusable, SETUP_COPY.signIn],
])(
  "%s does not accept an explanation present only in inert source text",
  async (key, intro, label) => {
    const site = fakeSite(
      siteWith(key, {
        status: 200,
        body: `${invitationPage("", label)}<script type="application/json">${JSON.stringify(intro)}</script><style>/* ${intro} */</style><!-- ${intro} -->`,
      }),
    );

    expect(await failuresOf(smokeChecks(BASE_URL, site.fetch))).toEqual([
      { request: key, problem: expect.stringContaining(intro) },
    ]);
  },
);

test.each([
  ["GET /signup", SIGNUP_COPY.intro, SIGNUP_COPY.signInLink],
  ["GET /setup", SETUP_COPY.unusable, SETUP_COPY.signIn],
])(
  "%s does not accept a sign-in anchor present only in inert source text",
  async (key, intro, label) => {
    const hiddenLink = invitationPage("", label);
    const site = fakeSite(
      siteWith(key, {
        status: 200,
        body: `${invitationPage(intro, "", "/elsewhere")}<script type="text/plain">${hiddenLink}</script><style>/* ${hiddenLink} */</style><!-- ${hiddenLink} -->`,
      }),
    );

    expect(await failuresOf(smokeChecks(BASE_URL, site.fetch))).toEqual([
      { request: key, problem: expect.stringContaining(label) },
    ]);
  },
);

test.each([
  ["GET /signup", SIGNUP_COPY.intro, SIGNUP_COPY.signInLink],
  ["GET /setup", SETUP_COPY.unusable, SETUP_COPY.signIn],
])(
  "%s accepts real page markup alongside streaming comments and scripts",
  async (key, intro, label) => {
    const site = fakeSite(
      siteWith(key, {
        status: 200,
        body: `<style>/* page styles */</style><!--$-->${invitationPage(intro, label)}<!--/$--><script>self.__next_f.push([1,"component data"])</script>`,
      }),
    );

    await expect(smokeChecks(BASE_URL, site.fetch)).resolves.toEqual([]);
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

test.each([
  ["no secret", undefined],
  ["an empty secret", ""],
])(
  "withProtectionBypass sends no bypass header with %s",
  async (_case, secret) => {
    const seen: RequestInit[] = [];
    const fetchFn: SmokeFetch = (_url: string, init: RequestInit) => {
      seen.push(init);
      return Promise.resolve(new Response(null, { status: 200 }));
    };

    await withProtectionBypass(fetchFn, secret)(`${BASE_URL}/login`, {
      redirect: "manual",
    });

    expect(
      new Headers(seen[0]?.headers).has("x-vercel-protection-bypass"),
    ).toBe(false);
  },
);
