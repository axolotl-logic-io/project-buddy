// "use_case_storage_unavailable" in use-cases/when-things-go-wrong.md, for
// the sign-in form: with the database unreachable, asking for a sign-in
// link answers with the database-unreachable case's message, which the form
// shows (link-request-form.test.tsx). The pages' part is
// test/app/(workspace)/projects/storage-unavailable.server.test.ts's.
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { requestLoginLinkAction } from "@/app/login/actions.ts";
import { userMessage } from "@/errors/app-error.ts";
import { spyOnErrorLog } from "../../errors/error-log-spy.ts";
import {
  restoreStorage,
  stubStorageDown,
} from "../../test-database/storage-down-test-kit.ts";

// The action reads the request's headers, for the link's address and the
// rate limit's client; this replaces the setup file's mock, so it keeps the
// session kit's cookies.
vi.mock("next/headers", async (importOriginal) => {
  const { sessionCookies } = await import(
    "../../test-database/session-test-kit.ts"
  );
  return {
    ...(await importOriginal<typeof import("next/headers")>()),
    cookies: sessionCookies,
    headers: (): Promise<Headers> =>
      Promise.resolve(new Headers({ host: "localhost" })),
  };
});

// Failures are logged; the test reads what the action answered instead.
spyOnErrorLog();

beforeAll(() => {
  stubStorageDown();
});

afterAll(() => {
  restoreStorage();
});

describe("use_case_storage_unavailable", () => {
  test("asking for a sign-in link answers with the storage message", async () => {
    const email = `storage-down-${crypto.randomUUID()}@example.test`;
    const form = new FormData();
    form.set("email", email);

    expect(await requestLoginLinkAction({ kind: "idle" }, form)).toEqual({
      kind: "error",
      message: userMessage("database-unreachable"),
      email,
    });
  });
});
