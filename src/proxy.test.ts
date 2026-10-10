// @vitest-environment node
import {
  getRedirectUrl,
  unstable_doesMiddlewareMatch,
} from "next/experimental/testing/server";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/auth/session-token";
import { config, proxy } from "@/proxy";

const secret = "test-session-secret";

function request(path: string, sessionToken?: string) {
  const headers = new Headers();
  if (sessionToken) {
    headers.set("cookie", `${SESSION_COOKIE_NAME}=${sessionToken}`);
  }
  return new NextRequest(`https://buddy.example${path}`, { headers });
}

function passesThrough(response: Response) {
  return response.headers.get("x-middleware-next") === "1";
}

describe("proxy matcher", () => {
  it.each(["/", "/login", "/projects/1", "/api/chat"])("runs on %s", (url) => {
    expect(unstable_doesMiddlewareMatch({ config, url })).toBe(true);
  });

  it.each([
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

  it("lets anyone reach the login page and its submit handler", () => {
    expect(passesThrough(proxy(request("/login")))).toBe(true);
  });

  it("redirects a page request without a session to /login", () => {
    const response = proxy(request("/projects/1"));

    expect(getRedirectUrl(response)).toBe("https://buddy.example/login");
  });

  it("rejects an API request without a session with 401", () => {
    const response = proxy(request("/api/chat"));

    expect(response.status).toBe(401);
  });

  it("redirects a request whose session is signed with another secret", () => {
    const token = createSessionToken("other-secret", new Date());

    expect(getRedirectUrl(proxy(request("/", token)))).toBe(
      "https://buddy.example/login",
    );
  });

  it("lets a request with a valid session through", () => {
    const token = createSessionToken(secret, new Date());

    expect(passesThrough(proxy(request("/", token)))).toBe(true);
    expect(passesThrough(proxy(request("/api/chat", token)))).toBe(true);
  });
});
