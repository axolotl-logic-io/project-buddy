// @vitest-environment node
// The session cases run against the test database in
// current-user.server.test.ts; these need none.
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { currentUser, requireUser } from "@/auth/current-user.ts";
import { SESSION_COOKIE_NAME } from "@/auth/session-token.ts";
import { SIGN_IN_PATH } from "@/routes.ts";

const SECRET = "test-session-secret";

const { cookieValue, readSessionUser, redirect } = vi.hoisted(() => ({
  cookieValue: vi.fn<() => string | undefined>(),
  readSessionUser: vi.fn(),
  redirect: vi.fn((path: string): never => {
    throw new Error(`redirect to ${path}`);
  }),
}));

vi.mock("next/headers", () => ({
  cookies: (): Promise<unknown> =>
    Promise.resolve({
      get: (name: string): { value: string } | undefined => {
        const value = cookieValue();
        if (name !== SESSION_COOKIE_NAME || value === undefined) {
          return undefined;
        }
        return { value };
      },
    }),
}));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("next/server", () => ({
  connection: (): Promise<void> => Promise.resolve(),
}));
vi.mock("@/accounts/users-store.ts", () => ({ readSessionUser }));

beforeEach(() => {
  vi.stubEnv("SESSION_SECRET", SECRET);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("currentUser", () => {
  test("is undefined without a valid cookie, without reading any user", async () => {
    cookieValue.mockReturnValue("not-a-token");

    expect(await currentUser()).toBeUndefined();
    cookieValue.mockReturnValue(undefined);
    expect(await currentUser()).toBeUndefined();
    expect(readSessionUser).not.toHaveBeenCalled();
  });
});

describe("requireUser", () => {
  test("redirects a signed-out request to the sign-in page", async () => {
    cookieValue.mockReturnValue(undefined);

    await expect(requireUser()).rejects.toThrow(`redirect to ${SIGN_IN_PATH}`);
  });
});
