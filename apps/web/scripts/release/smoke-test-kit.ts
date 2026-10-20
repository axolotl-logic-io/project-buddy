import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SETUP_COPY } from "../../src/ui/copy/invitations.ts";
import { SIGNUP_COPY } from "../../src/ui/copy/signup.ts";
import type { SmokeFetch } from "./smoke-checks.ts";

const BASE_URL = "https://project-buddy.example";

interface FakeAnswer {
  readonly status: number;
  readonly body?: string;
  readonly location?: string;
}

type FakeAnswers = Readonly<Record<string, FakeAnswer>>;

function invitationPage(
  explanation: string,
  signIn: string,
  href = "/login",
): string {
  return renderToStaticMarkup(
    createElement(
      "main",
      null,
      createElement("p", null, explanation),
      createElement("a", { href, className: "text-link" }, signIn),
    ),
  );
}

// The answers the live site gives when it is healthy, by "METHOD path".
const HEALTHY: FakeAnswers = {
  "GET /login": { status: 200, body: "<h1>Sign in</h1>" },
  "GET /signup": {
    status: 200,
    body: invitationPage(SIGNUP_COPY.intro, SIGNUP_COPY.signInLink),
  },
  "GET /setup": {
    status: 200,
    body: invitationPage(SETUP_COPY.unusable, SETUP_COPY.signIn),
  },
  "GET /": { status: 307, location: "/login" },
  "POST /api/chat": { status: 401, body: '{"case":"signed-out"}' },
};

const CHECKED_URLS: readonly string[] = [
  `${BASE_URL}/login`,
  `${BASE_URL}/signup`,
  `${BASE_URL}/setup`,
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

export { BASE_URL, CHECKED_URLS, fakeSite, HEALTHY, invitationPage, siteWith };
