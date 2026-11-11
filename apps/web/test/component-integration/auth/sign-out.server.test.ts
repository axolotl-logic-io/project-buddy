import { expect, test } from "vitest";
import {
  signOutAction,
  signOutEverywhereAction,
} from "@/app/(workspace)/account/actions.ts";
import { currentUser } from "@/auth/current-user.ts";
import { SESSION_COOKIE_NAME } from "@/auth/session-token.ts";
import { SIGN_IN_PATH } from "@/routes.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { expectRedirect } from "../test-database/navigation-test-kit.ts";
import { sessionCookies, signIn } from "../test-database/session-test-kit.ts";

test("sign out deletes this session while another session remains usable", async () => {
  const user = await testUser();
  await signIn(user);
  const cookies = await sessionCookies();
  const otherSession = cookies.get(SESSION_COOKIE_NAME);
  expect(otherSession).toBeDefined();
  await expectRedirect(signOutAction, SIGN_IN_PATH);
  expect(cookies.get(SESSION_COOKIE_NAME)).toBeUndefined();
  expect(await currentUser()).toBeUndefined();
  if (otherSession === undefined) {
    throw new Error("Missing session");
  }
  cookies.set(otherSession);
  expect((await currentUser())?.id).toBe(user.id);
});

test("sign out everywhere invalidates old sessions only for the acting user", async () => {
  const [user, other] = await Promise.all([testUser(), testUser()]);
  const cookies = await sessionCookies();
  await signIn(other);
  const otherSession = cookies.get(SESSION_COOKIE_NAME);
  await signIn(user);
  const oldSession = cookies.get(SESSION_COOKIE_NAME);
  await expectRedirect(signOutEverywhereAction, SIGN_IN_PATH);
  expect(cookies.get(SESSION_COOKIE_NAME)).toBeUndefined();
  if (oldSession === undefined || otherSession === undefined) {
    throw new Error("Missing sessions");
  }
  cookies.set(oldSession);
  expect(await currentUser()).toBeUndefined();
  cookies.set(otherSession);
  expect((await currentUser())?.id).toBe(other.id);
});
