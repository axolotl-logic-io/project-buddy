import { beforeEach, describe, expect, test, vi } from "vitest";
import type { requestLoginLink } from "@/accounts/login-links.ts";
import { requestLoginLinkAction } from "@/app/login/actions.ts";
import type { LinkRequestState } from "@/app/login/link-request-state.ts";
import { AppError } from "@/errors/app-error.ts";
import { LOGIN_COPY } from "@/ui/copy/login.ts";

const loginLinks = vi.hoisted(() => ({
  requestLoginLink: vi.fn<typeof requestLoginLink>(),
}));
vi.mock("@/accounts/login-links.ts", () => loginLinks);

const REQUEST_HEADERS = new Headers({ "x-forwarded-for": "203.0.113.7" });
vi.mock("next/headers", () => ({
  headers: (): Promise<Headers> => Promise.resolve(REQUEST_HEADERS),
}));

const IDLE: LinkRequestState = { kind: "idle" };
// Longer than any deliverable address once its domain is added.
const LONG_LOCAL_PART_LENGTH = 250;
const LONG_LOCAL_PART = "m".repeat(LONG_LOCAL_PART_LENGTH);

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
});

describe("requestLoginLinkAction", () => {
  test("asks for a link to the trimmed address, making no account, and says to check her email", async () => {
    const state = await requestLoginLinkAction(
      IDLE,
      form({ email: "  mabel@example.test " }),
    );

    expect(loginLinks.requestLoginLink).toHaveBeenCalledWith({
      email: "mabel@example.test",
      requestHeaders: REQUEST_HEADERS,
    });
    expect(state).toEqual({
      kind: "sent",
      message: LOGIN_COPY.checkEmail,
      email: "mabel@example.test",
    });
  });

  test.each([
    ["a missing address", form({})],
    ["a blank address", form({ email: "  " })],
    ["an address without a domain", form({ email: "mabel" })],
    [
      "an address too long to deliver",
      form({ email: `${LONG_LOCAL_PART}@example.test` }),
    ],
  ])("refuses %s, asking for nothing", async (_name, data) => {
    const state = await requestLoginLinkAction(IDLE, data);

    expect(state).toMatchObject({
      kind: "invalid",
      field: "email",
      message: LOGIN_COPY.needsEmail,
    });
    expect(loginLinks.requestLoginLink).not.toHaveBeenCalled();
  });
});

describe("requestLoginLinkAction failing", () => {
  test("shows the storage failure's message in the form", async () => {
    loginLinks.requestLoginLink.mockRejectedValue(
      new AppError("database-unreachable", new Error("down")),
    );

    const state = await requestLoginLinkAction(
      IDLE,
      form({ email: "mabel@example.test" }),
    );

    expect(state).toEqual({
      kind: "error",
      message: new AppError("database-unreachable", undefined).message,
      email: "mabel@example.test",
    });
  });

  test("rethrows any other failure", async () => {
    loginLinks.requestLoginLink.mockRejectedValue(new TypeError("bug"));

    await expect(
      requestLoginLinkAction(IDLE, form({ email: "mabel@example.test" })),
    ).rejects.toThrow("bug");
  });
});
