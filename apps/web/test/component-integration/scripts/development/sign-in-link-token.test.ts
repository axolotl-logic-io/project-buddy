// The development commands make sign-in links without the site's code, so
// these check the tokens, hashes and URLs against the site's own.
import { expect, test } from "vitest";
import { hashToken, TOKEN_FORMAT } from "@/accounts/emailed-link.ts";
import { SIGN_IN_LINK_PATH } from "@/routes.ts";
import { DEVELOPER_EMAIL } from "../../../../scripts/development/environment.ts";
import {
  hashLinkToken,
  linkEmail,
  newLinkToken,
  signInLinkUrl,
} from "../../../../scripts/development/sign-in-link-token.ts";

test("a development link token has the site's format, hash and path", async () => {
  const token = newLinkToken();
  expect(token).toMatch(TOKEN_FORMAT);
  expect(hashLinkToken(token)).toBe(await hashToken(token));
  const url = signInLinkUrl("http://localhost:3000", token);
  expect(url.pathname).toBe(SIGN_IN_LINK_PATH);
  expect(url.searchParams.get("token")).toBe(token);
});

test("a link's address is normalized, defaults to the developer's, and must be an address", () => {
  expect(linkEmail(" Dev@Example.TEST ")).toBe("dev@example.test");
  expect(linkEmail()).toBe(DEVELOPER_EMAIL);
  expect(() => linkEmail("someone")).toThrow("isn't an email address");
});
