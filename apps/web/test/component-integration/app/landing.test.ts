import { NextRequest } from "next/server";
import { afterEach, describe, expect, test, vi } from "vitest";
import { proxy } from "@/proxy.ts";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Home landing navigation", () => {
  test.each(["/", "/quests"])(
    "%s still requires sign-in before reading quests",
    async (path) => {
      vi.stubEnv("SESSION_SECRET", "landing-test-session-secret");
      const response = await proxy(new NextRequest(`http://localhost${path}`));
      expect(response.headers.get("location")).toBe("http://localhost/login");
    },
  );
});
