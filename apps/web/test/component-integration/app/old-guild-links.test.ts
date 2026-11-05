// The Guild was first called Buddies, at /buddies. Saved and shared links to
// it, and to a construct's page there, still open the Guild. The redirects
// are temporary, so no browser keeps them past a rollback to a build that
// still serves /buddies.
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

test("an old link to the Buddies page opens the Guild", async () => {
  expect(await follow("/buddies")).toEqual({
    status: HTTP_STATUS.temporaryRedirect,
    location: `${ORIGIN}/guild`,
  });
});

test("an old link to a construct's page opens its page in the Guild, query and all", async () => {
  expect(await follow("/buddies/hippy")).toEqual({
    status: HTTP_STATUS.temporaryRedirect,
    location: `${ORIGIN}/guild/hippy`,
  });
  expect(await follow("/buddies/my-own-construct?from=chat")).toEqual({
    status: HTTP_STATUS.temporaryRedirect,
    location: `${ORIGIN}/guild/my-own-construct?from=chat`,
  });
});

test("the Guild itself is not redirected", async () => {
  expect(await follow("/guild")).toEqual({
    status: HTTP_STATUS.ok,
    location: null,
  });
  expect(await follow("/guild/hippy")).toEqual({
    status: HTTP_STATUS.ok,
    location: null,
  });
});
