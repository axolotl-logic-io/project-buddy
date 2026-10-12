// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { User } from "@/accounts/users-store.ts";
import { currentUser, requireUser } from "@/auth/current-user.ts";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
} from "@/auth/session-token.ts";
import { userIdFixture } from "@/id-fixtures.ts";

const SECRET = "test-session-secret";
const MABEL: User = {
  id: userIdFixture(),
  email: "mabel@example.test",
  sessionEpoch: 1,
  hiddenExtras: [],
};

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
vi.mock("@/accounts/users-store.ts", () => ({ readSessionUser }));

async function signedInAs(user: User): Promise<void> {
  cookieValue.mockReturnValue(
    await createSessionToken(user, SECRET, new Date()),
  );
}

beforeEach(() => {
  vi.stubEnv("SESSION_SECRET", SECRET);
  readSessionUser.mockResolvedValue(MABEL);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("currentUser", () => {
  test("reads the user the session names, at the session's epoch", async () => {
    await signedInAs(MABEL);

    expect(await currentUser()).toEqual(MABEL);
    expect(readSessionUser).toHaveBeenCalledWith(MABEL.id, 1);
  });

  test("is undefined when the user's epoch has moved on", async () => {
    await signedInAs(MABEL);
    readSessionUser.mockResolvedValue(undefined);

    expect(await currentUser()).toBeUndefined();
  });

  test("is undefined without a valid cookie, without reading any user", async () => {
    cookieValue.mockReturnValue("not-a-token");

    expect(await currentUser()).toBeUndefined();
    cookieValue.mockReturnValue(undefined);
    expect(await currentUser()).toBeUndefined();
    expect(readSessionUser).not.toHaveBeenCalled();
  });
});

describe("requireUser", () => {
  test("returns the signed-in user", async () => {
    await signedInAs(MABEL);

    expect(await requireUser()).toEqual(MABEL);
  });

  test("redirects a signed-out request to the sign-in page", async () => {
    cookieValue.mockReturnValue(undefined);

    await expect(requireUser()).rejects.toThrow("redirect to /login");
  });
});
