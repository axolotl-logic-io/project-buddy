// "use_case_quick_note", when the storage can't be reached: quick capture's
// save fails with the database-unreachable message as its answer, rather
// than at the error boundary, so the form keeps the note's text
// (quick-capture-form.browser.test.tsx).
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { saveNoteAction } from "@/app/(workspace)/capture/actions.ts";
import { userMessage } from "@/errors/app-error.ts";
import { spyOnErrorLog } from "../../../errors/error-log-spy.ts";
import { signIn } from "../../../test-database/session-test-kit.ts";
import {
  restoreStorage,
  stubStorageDown,
  unstoredUser,
} from "../../../test-database/storage-down-test-kit.ts";

const user = unstoredUser();

// Failures are logged; the test reads what the save answered instead.
spyOnErrorLog();

beforeAll(() => {
  stubStorageDown();
});

afterAll(() => {
  restoreStorage();
});

describe("use_case_quick_note", () => {
  test("a save the storage can't take answers with the storage's message", async () => {
    await signIn(user);
    const form = new FormData();
    const projectId = crypto.randomUUID();
    form.set("projectId", projectId);
    form.set("text", "try a subdivision cage");

    expect(await saveNoteAction({ kind: "idle" }, form)).toEqual({
      kind: "failed",
      message: userMessage("database-unreachable"),
      text: "try a subdivision cage",
      projectId,
    });
  });
});
