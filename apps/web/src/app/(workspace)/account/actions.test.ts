import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  signOutAction,
  signOutEverywhereAction,
} from "@/app/(workspace)/account/actions.ts";
import { SIGNED_IN_USER, signInAs } from "@/auth/current-user-test-kit.ts";
import { AppError } from "@/errors/app-error.ts";

vi.mock(
  "@/auth/current-user.ts",
  () => import("@/auth/current-user-test-kit.ts"),
);

const usersStore = vi.hoisted(() => ({
  endEverySession: vi.fn<(userId: string) => Promise<void>>(),
}));
vi.mock("@/accounts/users-store.ts", () => usersStore);

const cookieJar = vi.hoisted(() => ({
  delete: vi.fn<(name: string) => void>(),
}));
vi.mock("next/headers", () => ({
  cookies: (): Promise<typeof cookieJar> => Promise.resolve(cookieJar),
}));

const navigation = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
}));
vi.mock("next/navigation", () => navigation);

beforeEach(() => {
  vi.clearAllMocks();
  signInAs(SIGNED_IN_USER);
  usersStore.endEverySession.mockResolvedValue();
});

describe("signOutAction", () => {
  test("clears this browser's session, then shows the sign-in page", async () => {
    await expect(signOutAction()).rejects.toThrow("NEXT_REDIRECT /login");

    expect(cookieJar.delete).toHaveBeenCalledWith("session");
    expect(usersStore.endEverySession).not.toHaveBeenCalled();
  });
});

describe("signing out everywhere", () => {
  test("ends every session of hers, clears this one, then shows the sign-in page", async () => {
    await expect(signOutEverywhereAction()).rejects.toThrow(
      "NEXT_REDIRECT /login",
    );

    expect(usersStore.endEverySession).toHaveBeenCalledWith(SIGNED_IN_USER.id);
    expect(cookieJar.delete).toHaveBeenCalledWith("session");
    const [ended] = usersStore.endEverySession.mock.invocationCallOrder;
    const [cleared] = cookieJar.delete.mock.invocationCallOrder;
    expect(ended).toBeLessThan(cleared ?? 0);
  });

  test("keeps the session when her sessions can't be ended", async () => {
    usersStore.endEverySession.mockRejectedValue(
      new AppError("database-unreachable", new Error("down")),
    );

    await expect(signOutEverywhereAction()).rejects.toBeInstanceOf(AppError);
    expect(cookieJar.delete).not.toHaveBeenCalled();
    expect(navigation.redirect).not.toHaveBeenCalled();
  });
});
