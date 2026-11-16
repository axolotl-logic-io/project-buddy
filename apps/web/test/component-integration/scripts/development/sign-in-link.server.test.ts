// The development command's sign-in links, against the test database: the
// site reads each link as its account's. A new address gets an invited
// account, so the link asks for a name, and an existing account keeps its
// state.
import { expect, test } from "vitest";
import { readSignInLinkUser } from "@/accounts/sign-in-links.ts";
import { findUserByEmail } from "@/accounts/users-store.ts";
import { readDatabaseUrl } from "@/env.ts";
import { createSignInLink } from "../../../../scripts/development/sign-in-link.ts";
import {
  testAddress,
  testUser,
} from "../../../support/test-database/user-test-kit.ts";

const ORIGIN = "http://localhost:3000";

function tokenOf(link: URL): string {
  return link.searchParams.get("token") ?? "";
}

test("a new address gets an invited account, which its link signs in to finish sign-up", async () => {
  const address = testAddress();
  const link = await createSignInLink(readDatabaseUrl(), ORIGIN, address);
  expect(link.origin).toBe(ORIGIN);
  const account = await findUserByEmail(address);
  expect(account?.accountState).toBe("invited");
  expect(await readSignInLinkUser(tokenOf(link), new Date())).toEqual({
    id: account?.id,
    sessionEpoch: 0,
    needsName: true,
  });
});

test("an existing account keeps its state, and its link signs it in", async () => {
  const user = await testUser();
  const link = await createSignInLink(readDatabaseUrl(), ORIGIN, user.email);
  expect(await readSignInLinkUser(tokenOf(link), new Date())).toEqual({
    id: user.id,
    sessionEpoch: user.sessionEpoch,
    needsName: false,
  });
});
