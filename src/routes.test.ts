// @vitest-environment node
import { expect, test } from "vitest";
import { SIGN_IN_PATH } from "@/routes.ts";

test("sends a visitor without a session to /login", () => {
  expect(SIGN_IN_PATH).toBe("/login");
});

test("the session-token module leaves the sign-in route to the routes module", async () => {
  const sessionToken = await import("@/auth/session-token.ts");

  expect(sessionToken).not.toHaveProperty("SIGN_IN_PATH");
});
