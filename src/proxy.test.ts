// @vitest-environment node
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  type SessionUser,
} from "@/auth/session-token.ts";
import { readAppErrorCase } from "@/errors/app-error.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { userIdFixture } from "@/id-fixtures.ts";
import { config, proxy } from "@/proxy.ts";

const secret = "test-session-secret";
const user: SessionUser = { id: userIdFixture(), sessionEpoch: 0 };

function request(path: string, sessionToken?: string): NextRequest {
  const headers = new Headers();
  if (sessionToken !== undefined) {
    headers.set("cookie", `${SESSION_COOKIE_NAME}=${sessionToken}`);
  }
  return new NextRequest(`https://buddy.example${path}`, { headers });
}

// Where a response redirects to, or null if it doesn't.
function redirectUrl(response: Response): string | null {
  return response.headers.get("location");
}

function passesThrough(response: Response): boolean {
  return response.headers.get("x-middleware-next") === "1";
}

describe("proxy matcher", () => {
  test.each(["/", "/login", "/projects/1", "/api/chat"])(
    "runs on %s",
    (url) => {
      expect(unstable_doesMiddlewareMatch({ config, url })).toBe(true);
    },
  );

  test.each([
    "/_next/static/chunks/app.js",
    "/_next/image?url=x",
    "/favicon.ico",
  ])("skips the static asset %s", (url) => {
    expect(unstable_doesMiddlewareMatch({ config, url })).toBe(false);
  });
});

describe("proxy", () => {
  beforeEach(() => {
    vi.stubEnv("SESSION_SECRET", secret);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test.each(["/login", "/signup", "/login/link"])(
    "lets anyone reach %s and its Server Actions",
    async (path) => {
      expect(passesThrough(await proxy(request(path)))).toBe(true);
    },
  );

  test("admits no other path below a public one", async () => {
    expect(redirectUrl(await proxy(request("/login/other")))).toBe(
      "https://buddy.example/login",
    );
  });

  test("redirects a page request without a session to /login", async () => {
    const response = await proxy(request("/projects/1"));

    expect(redirectUrl(response)).toBe("https://buddy.example/login");
  });

  test("rejects an API request without a session with 401 and the signed-out case", async () => {
    const response = await proxy(request("/api/chat"));

    expect(response.status).toBe(HTTP_STATUS.unauthorized);
    expect(readAppErrorCase(await response.text())).toBe("signed-out");
  });

  test("rejects an API request whose session has expired as signed out", async () => {
    const longAgo = new Date("2020-01-01T00:00:00Z");
    const token = await createSessionToken(user, secret, longAgo);

    const response = await proxy(request("/api/chat", token));

    expect(response.status).toBe(HTTP_STATUS.unauthorized);
    expect(await response.text()).toBe("signed-out");
  });

  test("redirects a request whose session is signed with another secret", async () => {
    const token = await createSessionToken(user, "other-secret", new Date());

    expect(redirectUrl(await proxy(request("/", token)))).toBe(
      "https://buddy.example/login",
    );
  });

  test("lets a request with a valid session through", async () => {
    const token = await createSessionToken(user, secret, new Date());

    expect(passesThrough(await proxy(request("/", token)))).toBe(true);
    expect(passesThrough(await proxy(request("/api/chat", token)))).toBe(true);
  });

  test("redirects a request whose session is in the format before accounts", async () => {
    const oldToken =
      "1794225600000.sJGPCn217JcEiQA6cPfJpgm1qkdSl7G3I1a8b5i_wKM";

    expect(redirectUrl(await proxy(request("/", oldToken)))).toBe(
      "https://buddy.example/login",
    );
  });
});
