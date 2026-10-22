// @vitest-environment node
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { sendInvitation } from "@/accounts/invitations.ts";
import { sendInvitationAction } from "@/app/(workspace)/invitations/actions.ts";
import { requireAdmin } from "@/auth/require-admin.ts";
import { sendEmail } from "@/email/send-email.ts";
import { INVITATIONS_COPY } from "@/ui/copy/invitations.ts";
import { FAKE_DATABASE_URL, fakeNeonHttp } from "../db/fake-neon-http.ts";
import { spyOnErrorLog } from "../errors/error-log-spy.ts";
import { userIdFixture } from "../id-fixtures.ts";

vi.mock("@/email/send-email.ts", () => ({ sendEmail: vi.fn() }));
vi.mock("@/auth/require-admin.ts", () => ({ requireAdmin: vi.fn() }));
vi.mock("next/headers", () => ({
  headers: (): Promise<Headers> =>
    Promise.resolve(new Headers({ origin: "http://localhost:3494" })),
}));

const EMPTY = { kind: "rows", columns: [], rows: [] } as const;
const RESERVED = {
  kind: "rows",
  columns: [{ name: "windowStartedAt", type: "timestamptz" }],
  rows: [["2026-10-22T10:00:00Z"]],
} as const;

beforeEach(() => {
  vi.stubEnv("SESSION_SECRET", "test-invitation-session-secret");
  vi.mocked(requireAdmin).mockResolvedValue({
    id: userIdFixture(),
    email: "admin@example.test",
    role: "admin",
    sessionEpoch: 0,
    hiddenExtras: [],
    name: undefined,
  });
});

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
    fakeNeonHttp(EMPTY, RESERVED, EMPTY, EMPTY, { kind: "unreachable" }, EMPTY)
      .fetch,
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

test("unavailable invitation accounting refuses delivery and reports failure", async () => {
  vi.stubEnv("DATABASE_URL", FAKE_DATABASE_URL);
  vi.stubGlobal("fetch", fakeNeonHttp({ kind: "unreachable" }).fetch);
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
    fakeNeonHttp(
      EMPTY,
      RESERVED,
      EMPTY,
      empty,
      empty,
      { kind: "unreachable" },
      EMPTY,
    ).fetch,
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
