import { beforeEach, describe, expect, test, vi } from "vitest";
import type { requestLoginLink } from "@/accounts/login-links.ts";
import type { LinkRequestState } from "@/app/login/link-request-state.ts";
import { signUpAction } from "@/app/signup/actions.ts";
import type { checkInviteCode } from "@/auth/failed-logins.ts";
import { AppError } from "@/errors/app-error.ts";
import { SIGNUP_COPY } from "@/ui/copy/signup.ts";

const loginLinks = vi.hoisted(() => ({
  requestLoginLink: vi.fn<typeof requestLoginLink>(),
}));
vi.mock("@/accounts/login-links.ts", () => loginLinks);

const failedLogins = vi.hoisted(() => ({
  checkInviteCode: vi.fn<typeof checkInviteCode>(),
}));
vi.mock("@/auth/failed-logins.ts", () => failedLogins);

const CLIENT_KEY = "203.0.113.7";
const REQUEST_HEADERS = new Headers({ "x-forwarded-for": CLIENT_KEY });
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
  failedLogins.checkInviteCode.mockResolvedValue("right");
});

describe("signUpAction with the right invite code", () => {
  test("asks for a link that makes the account, and says to check her email", async () => {
    const state = await signUpAction(
      IDLE,
      form({ inviteCode: "open sesame", email: ` ${EMAIL} ` }),
    );

    expect(failedLogins.checkInviteCode).toHaveBeenCalledWith(
      "open sesame",
      CLIENT_KEY,
      expect.any(Date),
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
      form({ inviteCode: "open sesame", email: EMAIL }),
    );

    expect(state).toEqual({
      kind: "error",
      message: STORAGE_DOWN.message,
      email: EMAIL,
    });
  });
});

describe("signUpAction refusing", () => {
  test("says a wrong invite code is wrong, asking for no link", async () => {
    failedLogins.checkInviteCode.mockResolvedValue("wrong");

    const state = await signUpAction(
      IDLE,
      form({ inviteCode: "guess", email: EMAIL }),
    );

    expect(state).toEqual({
      kind: "invalid",
      field: "inviteCode",
      message: SIGNUP_COPY.wrongInviteCode,
      email: EMAIL,
    });
    expect(loginLinks.requestLoginLink).not.toHaveBeenCalled();
  });

  test("says a locked-out client must wait, asking for no link", async () => {
    failedLogins.checkInviteCode.mockResolvedValue("locked-out");

    const state = await signUpAction(
      IDLE,
      form({ inviteCode: "open sesame", email: EMAIL }),
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
  test("checks a missing invite code as an empty one", async () => {
    await signUpAction(IDLE, form({ email: EMAIL }));

    expect(failedLogins.checkInviteCode).toHaveBeenCalledWith(
      "",
      CLIENT_KEY,
      expect.any(Date),
    );
  });

  test("refuses an address that isn't one before checking the invite code", async () => {
    const state = await signUpAction(
      IDLE,
      form({ inviteCode: "open sesame", email: "mabel" }),
    );

    expect(state).toEqual({
      kind: "invalid",
      field: "email",
      message: SIGNUP_COPY.needsEmail,
      email: "mabel",
    });
    expect(failedLogins.checkInviteCode).not.toHaveBeenCalled();
  });

  test("shows the storage failure's message when the invite code can't be checked", async () => {
    failedLogins.checkInviteCode.mockRejectedValue(STORAGE_DOWN);

    const state = await signUpAction(
      IDLE,
      form({ inviteCode: "open sesame", email: EMAIL }),
    );

    expect(state).toMatchObject({
      kind: "error",
      message: STORAGE_DOWN.message,
    });
    expect(loginLinks.requestLoginLink).not.toHaveBeenCalled();
  });
});
