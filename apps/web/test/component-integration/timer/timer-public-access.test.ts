// The Timer opened without a session: the proxy lets its setup and every
// timer link through, and still sends other signed-out pages to sign in.
import { NextRequest } from "next/server";
import { afterEach, describe, expect, test, vi } from "vitest";
import { HTTP_STATUS } from "@/http-status.ts";
import { proxy } from "@/proxy.ts";

const SITE = "http://localhost:3494";

afterEach(() => {
  vi.unstubAllEnvs();
});

// The proxy's answer to a signed-out request for path.
function signedOut(path: string): Promise<Response> {
  vi.stubEnv("SESSION_SECRET", "timer-test-session-secret");
  return proxy(new NextRequest(`${SITE}${path}`));
}

describe("use_case_timer_join_link", () => {
  test.each([
    "/timer",
    "/timer/25/15/1763197200000",
    "/timer/50/10/0",
    "/timer/25/16/0",
    "/timer/50",
    "/timer/50/10",
    "/timer/50/10/0/extra",
  ])("a signed-out visitor opens %s without signing in", async (path) => {
    const response = await signedOut(path);

    expect(response.status).toBe(HTTP_STATUS.ok);
    expect(response.headers.get("location")).toBeNull();
  });

  test("other signed-out pages still lead to sign-in", async () => {
    const response = await signedOut("/quests");

    expect(response.headers.get("location")).toBe(`${SITE}/login`);
    expect((await signedOut("/timers")).headers.get("location")).toBe(
      `${SITE}/login`,
    );
  });
});
