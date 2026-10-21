import { describe, expect, test } from "vitest";
import { endEverySession } from "@/accounts/users-store.ts";
import { currentUser, requireUser } from "@/auth/current-user.ts";
import { SIGN_IN_PATH } from "@/routes.ts";
import { expectRedirect } from "../test-database/navigation-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";
import { testUser } from "../test-database/user-test-kit.ts";

describe("currentUser", () => {
  test("is the user the session names, until they sign out everywhere", async () => {
    const user = await testUser();
    await signIn(user);

    expect((await requireUser()).id).toBe(user.id);

    await endEverySession(user.id);

    expect(await currentUser()).toBeUndefined();
    await expect(
      expectRedirect(() => requireUser(), SIGN_IN_PATH),
    ).resolves.toBeUndefined();
  });
});
