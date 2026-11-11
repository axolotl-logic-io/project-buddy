import {
  getRedirectUrl,
  unstable_getResponseFromNextConfig,
} from "next/experimental/testing/server";
import { expect, test } from "vitest";
import nextConfig from "../../../next.config.ts";

test.each([
  "",
  "?section=batteries",
  "?section=security",
  "?battery=returned",
  "?battery=canceled",
])(
  "old Account links retain their query when redirected to Settings (%s)",
  async (query) => {
    const response = await unstable_getResponseFromNextConfig({
      url: `http://localhost/account${query}`,
      nextConfig,
    });
    expect(response.status).toBe(307);
    // No fragment in Location lets the browser inherit the original anchor.
    expect(getRedirectUrl(response)).toBe(`http://localhost/settings${query}`);
  },
);
