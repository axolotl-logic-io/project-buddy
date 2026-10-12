import { beforeEach, describe, expect, test, vi } from "vitest";
import type { requestLoginLink } from "@/accounts/login-links.ts";
import type { LinkRequestState } from "@/app/login/link-request-state.ts";
import { signUpAction } from "@/app/signup/actions.ts";
import type { checkSignUpPassphrase } from "@/app/signup/passphrase.ts";
import { AppError } from "@/errors/app-error.ts";
import { SIGNUP_COPY } from "@/ui/copy/signup.ts";

const loginLinks = vi.hoisted(() => ({
  requestLoginLink: vi.fn<typeof requestLoginLink>(),
}));
vi.mock("@/accounts/login-links.ts", () => loginLinks);

const passphrase = vi.hoisted(() => ({
  checkSignUpPassphrase: vi.fn<typeof checkSignUpPassphrase>(),
}));
vi.mock("@/app/signup/passphrase.ts", () => passphrase);

const REQUEST_HEADERS = new Headers({ "x-forwarded-for": "203.0.113.7" });
vi.mock("next/headers", () => ({
  headers: (): Promise<Headers> => Promise.resolve(REQUEST_HEADERS),
}));

const IDLE: LinkRequestState = { kind: "idle" };
const EMAIL = "mabel@example.test";
const STORAGE_DOWN = new AppError("database-unreachable", new Error("down"));

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    data.set(key, value);
  }
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  loginLinks.requestLoginLink.mockResolvedValue();
  passphrase.checkSignUpPassphrase.mockResolvedValue("right");
});

describe("signUpAction with the right passphrase", () => {
  test("asks for a link that makes the account, and says to check her email", async () => {
    const state = await signUpAction(
      IDLE,
      form({ passphrase: "open sesame", email: ` ${EMAIL} ` }),
    );

    expect(passphrase.checkSignUpPassphrase).toHaveBeenCalledWith(
      "open sesame",
      REQUEST_HEADERS,
    );
    expect(loginLinks.requestLoginLink).toHaveBeenCalledWith({
      email: EMAIL,
      createAccount: true,
      requestHeaders: REQUEST_HEADERS,
    });
    expect(state).toEqual({
      kind: "sent",
      message: SIGNUP_COPY.checkEmail,
      email: EMAIL,
    });
  });

  test("shows the storage failure's message when the link can't be asked for", async () => {
    loginLinks.requestLoginLink.mockRejectedValue(STORAGE_DOWN);

    const state = await signUpAction(
      IDLE,
      form({ passphrase: "open sesame", email: EMAIL }),
    );

    expect(state).toEqual({
      kind: "error",
      message: STORAGE_DOWN.message,
      email: EMAIL,
    });
  });
});

describe("signUpAction refusing", () => {
  test("says a wrong passphrase is wrong, asking for no link", async () => {
    passphrase.checkSignUpPassphrase.mockResolvedValue("wrong");

    const state = await signUpAction(
      IDLE,
      form({ passphrase: "guess", email: EMAIL }),
    );

    expect(state).toEqual({
      kind: "invalid",
      field: "passphrase",
      message: SIGNUP_COPY.wrongPassphrase,
      email: EMAIL,
    });
    expect(loginLinks.requestLoginLink).not.toHaveBeenCalled();
  });

  test("says a locked-out client must wait, asking for no link", async () => {
    passphrase.checkSignUpPassphrase.mockResolvedValue("locked-out");

    const state = await signUpAction(
      IDLE,
      form({ passphrase: "open sesame", email: EMAIL }),
    );

    expect(state).toEqual({
      kind: "error",
      message: SIGNUP_COPY.lockedOut,
      email: EMAIL,
    });
    expect(loginLinks.requestLoginLink).not.toHaveBeenCalled();
  });
});

describe("signUpAction reading the form", () => {
  test("checks a missing passphrase as an empty one", async () => {
    await signUpAction(IDLE, form({ email: EMAIL }));

    expect(passphrase.checkSignUpPassphrase).toHaveBeenCalledWith(
      "",
      REQUEST_HEADERS,
    );
  });

  test("refuses an address that isn't one before checking the passphrase", async () => {
    const state = await signUpAction(
      IDLE,
      form({ passphrase: "open sesame", email: "mabel" }),
    );

    expect(state).toEqual({
      kind: "invalid",
      field: "email",
      message: SIGNUP_COPY.needsEmail,
      email: "mabel",
    });
    expect(passphrase.checkSignUpPassphrase).not.toHaveBeenCalled();
  });

  test("shows the storage failure's message when the passphrase can't be checked", async () => {
    passphrase.checkSignUpPassphrase.mockRejectedValue(STORAGE_DOWN);

    const state = await signUpAction(
      IDLE,
      form({ passphrase: "open sesame", email: EMAIL }),
    );

    expect(state).toMatchObject({
      kind: "error",
      message: STORAGE_DOWN.message,
    });
    expect(loginLinks.requestLoginLink).not.toHaveBeenCalled();
  });
});
