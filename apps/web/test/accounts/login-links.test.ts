// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  type LoginLinkRequest,
  requestLoginLink,
} from "@/accounts/login-links.ts";
import { EmailFailure } from "@/email/email-failure.ts";
import type { EmailMessage } from "@/email/email-message.ts";
import { AppError } from "@/errors/app-error.ts";
import { LOGIN_EMAIL_COPY } from "@/ui/copy/login.ts";
import {
  FAKE_DATABASE_URL,
  type FakeNeonHttp,
  fakeNeonHttp,
  type NeonHttpAnswer,
} from "../db/fake-neon-http.ts";
import { spyOnErrorLog } from "../errors/error-log-spy.ts";
import { userIdFixture } from "../id-fixtures.ts";

const NOW = new Date("2026-10-12T12:00:00.000Z");
const USER_ID = userIdFixture("5b1f0c3e-8a2d-4c6b-9e7f-0a1b2c3d4e5f");
const EMAIL = "mabel@example.test";
const SITE = "http://localhost:3103";
const LINK_IN_TEXT = /https?:\/\/\S+\/login\/link\?\S+/u;
const TOKEN_FORMAT = /^[\w-]{43}$/u;

// Each scheduled after() callback, run by the test.
const scheduled = vi.hoisted((): (() => Promise<unknown>)[] => []);
vi.mock("next/server", () => ({
  after: (task: () => Promise<unknown>): void => {
    scheduled.push(task);
  },
}));

const email = vi.hoisted(() => ({
  sendEmail: vi.fn<(message: EmailMessage) => Promise<void>>(),
}));
vi.mock("@/email/send-email.ts", () => email);

// The rate limits, at their public seam: within them unless a test says
// otherwise. rate-limits.server.test.ts counts them.
const limits = vi.hoisted(() => ({
  countLoginLinkRequest:
    vi.fn<
      (address: string, clientKey: string, now: Date) => Promise<boolean>
    >(),
}));
vi.mock("@/accounts/rate-limits.ts", () => limits);

const NO_ROWS: NeonHttpAnswer = { kind: "rows", columns: [], rows: [] };
const MABEL: NeonHttpAnswer = {
  kind: "rows",
  columns: [
    { name: "id", type: "text" },
    { name: "email", type: "text" },
    { name: "session_epoch", type: "int4" },
    { name: "hidden_extras", type: "_text" },
    { name: "created_at", type: "timestamptz" },
  ],
  rows: [[USER_ID, EMAIL, "2", "{}", "2026-10-01 09:00:00+00"]],
};

const HEXADECIMAL = 16;
const BYTE_HEX_DIGITS = 2;

// The text's SHA-256 in hexadecimal, as login_links stores a token's.
async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(HEXADECIMAL).padStart(BYTE_HEX_DIGITS, "0"),
  ).join("");
}

function database(...answers: readonly NeonHttpAnswer[]): FakeNeonHttp {
  const [first = NO_ROWS, ...later] = answers;
  const neonHttp = fakeNeonHttp(first, ...later);
  vi.stubGlobal("fetch", neonHttp.fetch);
  return neonHttp;
}

function request(fields: Partial<LoginLinkRequest> = {}): LoginLinkRequest {
  return {
    email: " Mabel@Example.TEST ",
    requestHeaders: new Headers({
      origin: SITE,
      "x-forwarded-for": "203.0.113.7, 10.0.0.1",
    }),
    ...fields,
  };
}

// Takes the request, then runs what it left for after the response.
async function requestAndSend(
  fields?: Partial<LoginLinkRequest>,
): Promise<void> {
  await requestLoginLink(request(fields));
  await Promise.all(scheduled.splice(0).map((task) => task()));
}

function sentMessage(): EmailMessage {
  const [message] = email.sendEmail.mock.calls[0] ?? [];
  if (message === undefined) {
    throw new Error("No email was sent");
  }
  return message;
}

function tokenIn(message: EmailMessage): string {
  const [link = ""] = LINK_IN_TEXT.exec(message.text) ?? [];
  return new URL(link).searchParams.get("token") ?? "";
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  vi.stubEnv("DATABASE_URL", FAKE_DATABASE_URL);
  vi.stubEnv("SESSION_SECRET", "test-session-secret-at-least-32-characters");
  vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", undefined);
  email.sendEmail.mockResolvedValue();
  limits.countLoginLinkRequest.mockResolvedValue(true);
  scheduled.length = 0;
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("requestLoginLink for an account", () => {
  test("counts the request against the rate limits, and emails nothing before answering", async () => {
    database(MABEL);

    await requestLoginLink(request());

    expect(limits.countLoginLinkRequest).toHaveBeenCalledWith(
      EMAIL,
      "203.0.113.7",
      NOW,
    );
    expect(email.sendEmail).not.toHaveBeenCalled();
  });

  test("after the response, saves a link and emails it", async () => {
    const neonHttp = database(MABEL);

    await requestAndSend();

    const message = sentMessage();
    const token = tokenIn(message);
    const tokenHash = await sha256Hex(token);
    expect(token).toMatch(TOKEN_FORMAT);
    expect(message.to).toBe(EMAIL);
    expect(message.subject).toBe(LOGIN_EMAIL_COPY.subject);
    expect(message.text).toContain(`${SITE}/login/link?token=${token}`);
    expect(message.idempotencyKey).toBe(`login-link/${tokenHash}`);
    expect(JSON.stringify(neonHttp.queries)).not.toContain(token);
  });

  test("makes each link with its own token", async () => {
    database(MABEL, NO_ROWS, NO_ROWS);
    await requestAndSend();
    database(MABEL);
    await requestAndSend();

    const keys = email.sendEmail.mock.calls.map(
      ([message]) => message.idempotencyKey,
    );
    expect(new Set(keys).size).toBe(2);
  });
});

describe("requestLoginLink's link", () => {
  test("leads to the production domain on Vercel, whatever the request says", async () => {
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "buddy.example.com");
    database(MABEL);

    await requestAndSend({
      requestHeaders: new Headers({
        origin: "https://attacker.example",
        host: "attacker.example",
      }),
    });

    expect(sentMessage().text).toContain(
      "https://buddy.example.com/login/link?token=",
    );
  });

  test("leads to the request's host when the request has no origin", async () => {
    database(MABEL);

    await requestAndSend({
      requestHeaders: new Headers({ host: "localhost:3103" }),
    });

    expect(sentMessage().text).toContain(`${SITE}/login/link?token=`);
  });
});

describe("requestLoginLink sending nothing", () => {
  test("for an address with no account, when signing in", async () => {
    database(NO_ROWS);

    await requestAndSend();

    expect(email.sendEmail).not.toHaveBeenCalled();
  });

  test("past the rate limits, and schedules nothing", async () => {
    limits.countLoginLinkRequest.mockResolvedValue(false);
    database(MABEL);

    await requestLoginLink(request());

    expect(scheduled).toEqual([]);
  });

  test("throws the storage case when the counts can't be saved", async () => {
    limits.countLoginLinkRequest.mockRejectedValue(
      new AppError("database-unreachable", new Error("fetch failed")),
    );

    await expect(requestLoginLink(request())).rejects.toBeInstanceOf(AppError);
    expect(scheduled).toEqual([]);
  });
});

describe("requestLoginLink logging what it couldn't send", () => {
  test("logs Resend's problem, without the address, the token or its hash", async () => {
    const log = spyOnErrorLog();
    database(MABEL);
    email.sendEmail.mockRejectedValue(
      new EmailFailure("Resend answered 429 daily_quota_exceeded: ", {
        problem: "quota",
      }),
    );

    await requestAndSend();

    const token = tokenIn(sentMessage());
    const line = log.mock.calls.map((call) => call.join(" ")).join("\n");
    expect(line).toContain("[email-error] quota in send login link");
    expect(line).not.toContain(EMAIL);
    expect(line).not.toContain(token);
    expect(line).not.toContain(await sha256Hex(token));
  });

  test("logs an unreachable database as retryable", async () => {
    const log = spyOnErrorLog();
    database({ kind: "unreachable" });

    await requestAndSend();

    const lines = log.mock.calls.map((call) => call.join(" "));
    expect(lines).toContainEqual(
      expect.stringContaining("[email-error] retryable in send login link"),
    );
    expect(email.sendEmail).not.toHaveBeenCalled();
  });
});
