import { beforeEach, describe, expect, test, vi } from "vitest";
import { USER_NAME_MAX_LENGTH } from "@/accounts/user-name.ts";
import {
  type SetNameState,
  setNameAction,
  signOutAction,
  signOutEverywhereAction,
} from "@/app/(workspace)/account/actions.ts";
import { AppError } from "@/errors/app-error.ts";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";
import {
  SIGNED_IN_USER,
  SIGNED_OUT_REDIRECT,
  signInAs,
  signOut,
} from "../../../auth/current-user-test-kit.ts";

vi.mock(
  "@/auth/current-user.ts",
  () => import("../../../auth/current-user-test-kit.ts"),
);

const usersStore = vi.hoisted(() => ({
  endEverySession: vi.fn<(userId: string) => Promise<void>>(),
  saveUserName:
    vi.fn<(userId: string, name: string | undefined) => Promise<void>>(),
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
  notFound: vi.fn((): never => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));
vi.mock("next/navigation", () => navigation);

const cache = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/cache", () => cache);

const IDLE: SetNameState = { kind: "idle" };

// The name form as submitted, with these fields.
function nameForm(fields: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }
  return formData;
}

beforeEach(() => {
  vi.clearAllMocks();
  signInAs(SIGNED_IN_USER);
  usersStore.endEverySession.mockResolvedValue();
  usersStore.saveUserName.mockResolvedValue();
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

describe("setNameAction", () => {
  test("saves her trimmed name, for her alone, whatever user the form names", async () => {
    const result = await setNameAction(
      IDLE,
      nameForm({
        name: "  Mabel ",
        userId: "0f0e0d0c-0b0a-4908-8706-050403020100",
        id: "0f0e0d0c-0b0a-4908-8706-050403020100",
      }),
    );

    expect(result).toEqual({ kind: "saved" });
    expect(usersStore.saveUserName).toHaveBeenCalledTimes(1);
    expect(usersStore.saveUserName).toHaveBeenCalledWith(
      SIGNED_IN_USER.id,
      "Mabel",
    );
    expect(cache.refresh).toHaveBeenCalled();
  });

  test("an empty field clears her name", async () => {
    const result = await setNameAction(IDLE, nameForm({ name: "   " }));

    expect(result).toEqual({ kind: "saved" });
    expect(usersStore.saveUserName).toHaveBeenCalledWith(
      SIGNED_IN_USER.id,
      undefined,
    );
  });
});

describe("setNameAction refusing", () => {
  test.each([
    ["braces", "{x}", ACCOUNT_COPY.nameBraces],
    ["a line break", "Ma\nbel", ACCOUNT_COPY.nameMultiLine],
    [
      "too many characters",
      "a".repeat(USER_NAME_MAX_LENGTH + 1),
      ACCOUNT_COPY.nameTooLong(USER_NAME_MAX_LENGTH),
    ],
  ])(
    "refuses a name with %s, saving nothing",
    async (_problem, name, message) => {
      const result = await setNameAction(IDLE, nameForm({ name }));

      expect(result).toEqual({ kind: "invalid", message });
      expect(usersStore.saveUserName).not.toHaveBeenCalled();
      expect(cache.refresh).not.toHaveBeenCalled();
    },
  );

  test("a form with no name field is not found", async () => {
    await expect(setNameAction(IDLE, nameForm({}))).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(usersStore.saveUserName).not.toHaveBeenCalled();
  });

  test("a signed-out request saves nothing", async () => {
    signOut();

    await expect(
      setNameAction(IDLE, nameForm({ name: "Mabel" })),
    ).rejects.toThrow(SIGNED_OUT_REDIRECT);
    expect(usersStore.saveUserName).not.toHaveBeenCalled();
  });
});
