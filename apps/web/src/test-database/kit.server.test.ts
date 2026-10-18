import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { after } from "next/server";
import { describe, expect, test } from "vitest";
import { findUserByEmail } from "@/accounts/users-store.ts";
import { currentUser, requireUser } from "@/auth/current-user.ts";
import {
  readSessionToken,
  SESSION_COOKIE_NAME,
  sessionCookie,
} from "@/auth/session-token.ts";
import { readSessionSecret } from "@/env.ts";
import { listProjects } from "@/projects/store.ts";
import { SIGN_IN_PATH } from "@/routes.ts";
import { afterTasksDone } from "@/test-database/after-test-kit.ts";
import { testData } from "@/test-database/data-test-kit.ts";
import {
  expectNotFound,
  expectRedirect,
} from "@/test-database/navigation-test-kit.ts";
import {
  lapsed,
  requestWithSession,
  signIn,
  signOut,
} from "@/test-database/session-test-kit.ts";
import { deleteTestUsers, testUser } from "@/test-database/user-test-kit.ts";

const SESSION_IN_COOKIE = /(?:^|; )session=(?<token>[^;]+)/u;

describe("a server test's session", () => {
  test("starts signed out", async () => {
    expect(await currentUser()).toBeUndefined();
  });

  test("is the test user's once signed in, until signed out", async () => {
    const user = await testUser();

    await signIn(user);

    expect((await currentUser())?.id).toBe(user.id);

    signOut();

    expect(await currentUser()).toBeUndefined();
  });

  test("sends a lapsed session to sign in", async () => {
    await lapsed(await testUser());

    await expect(
      expectRedirect(() => requireUser(), SIGN_IN_PATH),
    ).resolves.toBeUndefined();
  });

  test("reads what code sets and deletes through cookies()", async () => {
    const user = await testUser();

    (await cookies()).set(
      await sessionCookie(user, readSessionSecret(), new Date()),
    );

    expect((await currentUser())?.id).toBe(user.id);

    (await cookies()).delete(SESSION_COOKIE_NAME);

    expect(await currentUser()).toBeUndefined();
  });
});

describe("a server test's request", () => {
  test("carries the session to a route handler", async () => {
    const user = await testUser();
    await signIn(user);

    const request = requestWithSession("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
    });
    const { token } =
      SESSION_IN_COOKIE.exec(request.headers.get("cookie") ?? "")?.groups ?? {};

    expect(request.method).toBe("POST");
    expect(request.headers.get("content-type")).toBe("application/json");
    expect(
      (await readSessionToken(token, readSessionSecret(), new Date()))?.id,
    ).toBe(user.id);
  });

  test("carries no cookie when signed out", () => {
    expect(
      requestWithSession("http://localhost/api/chat").headers.get("cookie"),
    ).toBeNull();
  });
});

describe("the navigation checks", () => {
  test("pass when the action redirects or is not found", async () => {
    await expect(
      expectRedirect(() => redirect(SIGN_IN_PATH), SIGN_IN_PATH),
    ).resolves.toBeUndefined();
    await expect(
      expectNotFound(async () => notFound()),
    ).resolves.toBeUndefined();
  });

  test("fail when the action resolves", async () => {
    await expect(
      expectRedirect(() => Promise.resolve(), SIGN_IN_PATH),
    ).rejects.toThrow("resolved");
    await expect(expectNotFound(() => Promise.resolve())).rejects.toThrow(
      "resolved",
    );
  });

  test("fail when the action redirects elsewhere or throws another error", async () => {
    await expect(
      expectRedirect(() => redirect("/projects"), SIGN_IN_PATH),
    ).rejects.toThrow("not to /projects");
    await expect(
      expectRedirect(() => notFound(), SIGN_IN_PATH),
    ).rejects.toThrow("Expected a redirect");
    await expect(expectNotFound(() => redirect(SIGN_IN_PATH))).rejects.toThrow(
      "not found",
    );
  });
});

// Starts, through after(), a task that starts another, each recording its
// name in done, and a task that fails.
function startAfterTasks(done: string[]): void {
  after(async () => {
    await Promise.resolve();
    done.push("task");
    after(() => {
      done.push("nested task");
    });
  });
  after(Promise.reject(new Error("A failed task")));
}

describe("a server test's after() tasks", () => {
  test("run, and afterTasksDone waits for them and the tasks they start", async () => {
    const done: string[] = [];

    startAfterTasks(done);
    await afterTasksDone();

    expect(done).toEqual(["task", "nested task"]);
  });
});

describe("a server test's users", () => {
  test("are deleted with everything they own", async () => {
    const user = await testUser();
    await testData(user).project();

    expect(await listProjects(user.id)).toHaveLength(1);

    await deleteTestUsers();

    expect(await findUserByEmail(user.email)).toBeUndefined();
    expect(await listProjects(user.id)).toStrictEqual([]);
  });
});
