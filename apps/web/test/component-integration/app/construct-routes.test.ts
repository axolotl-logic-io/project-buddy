// Saved links from earlier names open Constructs, including detail pages.
// Temporary redirects keep rollback routes usable.

import {
  getRedirectUrl,
  unstable_getResponseFromNextConfig,
} from "next/experimental/testing/server";
import { expect, test } from "vitest";
import { HTTP_STATUS } from "@/http-status.ts";
import nextConfig from "../../../next.config.ts";

const ORIGIN = "https://project-buddy.example";

async function follow(path: string): Promise<{
  readonly status: number;
  readonly location: string | null;
}> {
  const response = await unstable_getResponseFromNextConfig({
    url: `${ORIGIN}${path}`,
    nextConfig,
  });
  return { status: response.status, location: getRedirectUrl(response) };
}

test("Next routes collection and editor links to their page adapters", async () => {
  expect(await follow("/constructs")).toEqual({
    status: HTTP_STATUS.ok,
    location: null,
  });
  expect(await follow("/constructs/vellum")).toEqual({
    status: HTTP_STATUS.ok,
    location: null,
  });
});
