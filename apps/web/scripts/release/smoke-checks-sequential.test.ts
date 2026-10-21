// @vitest-environment node
import { expect, test } from "vitest";
import { SIGNUP_COPY } from "../../src/ui/copy/signup.ts";
import { type SmokeFetch, smokeChecks } from "./smoke-checks.ts";
import {
  BASE_URL,
  CHECKED_URLS,
  fakeSite,
  HEALTHY,
  invitationPage,
} from "./smoke-test-kit.ts";

// smokeChecks sends the live site one request at a time, reading and
// checking each answer before the next.
test("smokeChecks starts no request while reading an answer", async () => {
  const site = fakeSite(HEALTHY);
  const reading = Promise.withResolvers<undefined>();
  const body = Promise.withResolvers<string>();
  const pausedUrl = `${BASE_URL}/signup`;
  const pausingFetch: SmokeFetch = async (url: string, init: RequestInit) => {
    const response = await site.fetch(url, init);
    if (url === pausedUrl) {
      response.text = (): Promise<string> => {
        reading.resolve(undefined);
        return body.promise;
      };
    }
    return response;
  };
  const result = smokeChecks(BASE_URL, pausingFetch);

  try {
    await reading.promise;
    expect(site.requests.at(-1)?.url).toBe(pausedUrl);
  } finally {
    body.resolve(invitationPage(SIGNUP_COPY.intro, SIGNUP_COPY.signInLink));
  }
  await expect(result).resolves.toEqual([]);
  expect(site.requests).toHaveLength(CHECKED_URLS.length);
});

test.each(["GET /signup", "GET /setup"])(
  "smokeChecks reports a body read failure for %s and continues",
  async (key) => {
    const site = fakeSite(HEALTHY);
    const failingFetch: SmokeFetch = async (url: string, init: RequestInit) => {
      const response = await site.fetch(url, init);
      if (`GET ${new URL(url).pathname}` === key) {
        response.text = (): Promise<string> =>
          Promise.reject(new Error("body interrupted"));
      }
      return response;
    };

    await expect(smokeChecks(BASE_URL, failingFetch)).resolves.toEqual([
      `${key}: request failed: body interrupted`,
    ]);
    expect(site.requests.map(({ url }) => url)).toEqual(CHECKED_URLS);
  },
);
