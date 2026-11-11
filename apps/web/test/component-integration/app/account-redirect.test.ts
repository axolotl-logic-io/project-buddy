import {
  getRedirectUrl,
  unstable_getResponseFromNextConfig,
} from "next/experimental/testing/server";
import { expect, test } from "vitest";
import nextConfig from "../../../next.config.ts";

const TEMPORARY_REDIRECT = 307;

test.each([
  "",
  "?battery=returned",
  "?battery=canceled",
])(
  "old Account links retain their query when redirected to Settings (%s)",
  async (query) => {
    const response = await unstable_getResponseFromNextConfig({
      url: `http://localhost/account${query}`,
      nextConfig,
    });
    expect(response.status).toBe(TEMPORARY_REDIRECT);
    // No fragment in Location lets the browser inherit the original anchor.
    expect(getRedirectUrl(response)).toBe(`http://localhost/settings${query}`);
  },
);

test.each(["batteries", "security"])(
  "old Account section links reach the corresponding Settings content (%s)",
  async (section) => {
    const response = await unstable_getResponseFromNextConfig({
      url: `http://localhost/account?section=${section}`,
      nextConfig,
    });
    expect(getRedirectUrl(response)).toBe(`http://localhost/settings?section=${section}#${section}`);
  },
);
