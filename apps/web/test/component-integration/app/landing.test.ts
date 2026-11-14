import { NextRequest } from "next/server";
import { afterEach, describe, expect, test, vi } from "vitest";
import Root from "@/app/page.tsx";
import { proxy } from "@/proxy.ts";
import { expectRedirect } from "../test-database/navigation-test-kit.ts";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Quests landing navigation", () => {
  test("the root address leads directly to Quests", async () => {
    await expect(expectRedirect(Root, "/quests")).resolves.toBeUndefined();
  });

  test.each(["/", "/quests"])(
    "%s still requires sign-in before reading quests",
    async (path) => {
      vi.stubEnv("SESSION_SECRET", "landing-test-session-secret");
      const response = await proxy(new NextRequest(`http://localhost${path}`));
      expect(response.headers.get("location")).toBe("http://localhost/login");
    },
  );
});
