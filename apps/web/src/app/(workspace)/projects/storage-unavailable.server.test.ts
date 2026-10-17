// "use_case_storage_unavailable" in use-cases/when-things-go-wrong.md, for
// the pages and the forms she uses while signed in: with the database
// unreachable, each fails with the database-unreachable case, which the
// error boundary shows as its fixed message (error.test.tsx, and
// @header/error.test.tsx for the empty header), and saves nothing. The
// sign-in form's part is src/app/login/storage-unavailable.server.test.ts's.
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import ChatPage from "@/app/(workspace)/chats/[chatId]/page.tsx";
import ProjectsPage from "@/app/(workspace)/projects/(list)/page.tsx";
import { createProjectAction } from "@/app/(workspace)/projects/actions.ts";
import {
  restoreStorage,
  stubStorageDown,
  unstoredUser,
} from "@/db/storage-down-test-kit.ts";
import { spyOnErrorLog } from "@/errors/error-log-spy.ts";
import { signIn } from "@/test-database/session-test-kit.ts";

// The storage failure, as the error boundary reads it.
const UNREACHABLE = {
  errorCase: "database-unreachable",
  digest: "database-unreachable",
};

const user = unstoredUser();

// Failures are logged; the tests read what each call did instead.
spyOnErrorLog();

beforeAll(() => {
  stubStorageDown();
});

afterAll(() => {
  restoreStorage();
});

describe("use_case_storage_unavailable", () => {
  test("her projects and a chat fail with the storage case", async () => {
    await signIn(user);

    await expect(ProjectsPage()).rejects.toMatchObject(UNREACHABLE);
    await expect(
      ChatPage({
        params: Promise.resolve({ chatId: crypto.randomUUID() }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toMatchObject(UNREACHABLE);
  });

  test("saving a project fails with the storage case, and saves nothing", async () => {
    await signIn(user);
    const form = new FormData();
    form.set("name", `Unsaved project ${crypto.randomUUID()}`);

    await expect(
      createProjectAction({ kind: "idle" }, form),
    ).rejects.toMatchObject(UNREACHABLE);

    // The modules imported above keep their unreachable client; a fresh
    // store reads the working database.
    restoreStorage();
    const { listProjects } = await import("@/projects/store.ts");
    expect(await listProjects(user.id)).toEqual([]);
  });
});
