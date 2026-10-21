// @vitest-environment node
import { afterEach, expect, test, vi } from "vitest";
import { sendInvitation } from "@/accounts/invitations.ts";
import { sendInvitationAction } from "@/app/(workspace)/invitations/actions.ts";
import { sendEmail } from "@/email/send-email.ts";
import { INVITATIONS_COPY } from "@/ui/copy/invitations.ts";
import { FAKE_DATABASE_URL, fakeNeonHttp } from "../db/fake-neon-http.ts";
import { spyOnErrorLog } from "../errors/error-log-spy.ts";

vi.mock("@/email/send-email.ts", () => ({ sendEmail: vi.fn() }));
vi.mock("@/auth/require-admin.ts", () => ({ requireAdmin: vi.fn() }));
vi.mock("next/headers", () => ({
  headers: (): Promise<Headers> =>
    Promise.resolve(new Headers({ origin: "http://localhost:3494" })),
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

test("a storage failure saving an invitation sends no email and is reported as a retryable failure to the admin", async () => {
  vi.stubEnv("DATABASE_URL", FAKE_DATABASE_URL);
  vi.stubGlobal(
    "fetch",
    fakeNeonHttp(
      { kind: "rows", columns: [], rows: [] },
      { kind: "unreachable" },
    ).fetch,
  );
  spyOnErrorLog();
  const form = new FormData();
  form.set("email", "learner@example.test");
  expect(await sendInvitationAction({ kind: "idle" }, form)).toMatchObject({
    kind: "error",
    message: INVITATIONS_COPY.failed,
  });
  expect(sendEmail).not.toHaveBeenCalled();
});

test("failure looking up an address cannot be treated as a successful send", async () => {
  vi.stubEnv("DATABASE_URL", FAKE_DATABASE_URL);
  vi.stubGlobal("fetch", fakeNeonHttp({ kind: "unreachable" }).fetch);
  spyOnErrorLog();
  await expect(
    sendInvitation("learner@example.test", new Headers()),
  ).rejects.toThrow();
  expect(sendEmail).not.toHaveBeenCalled();
});

test("an activation failure after email acceptance is reported as failure, not success", async () => {
  vi.stubEnv("DATABASE_URL", FAKE_DATABASE_URL);
  const empty = { kind: "rows", columns: [], rows: [] } as const;
  vi.stubGlobal(
    "fetch",
    fakeNeonHttp(empty, empty, { kind: "unreachable" }).fetch,
  );
  vi.mocked(sendEmail).mockClear().mockResolvedValue();
  spyOnErrorLog();
  const form = new FormData();
  form.set("email", "learner@example.test");
  expect(await sendInvitationAction({ kind: "idle" }, form)).toMatchObject({
    kind: "error",
    message: INVITATIONS_COPY.failed,
  });
  expect(sendEmail).toHaveBeenCalledOnce();
});
