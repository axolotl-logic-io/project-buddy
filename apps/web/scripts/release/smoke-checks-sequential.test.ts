// @vitest-environment node
import { expect, test } from "vitest";
import { type SmokeFetch, smokeChecks } from "./smoke-checks.ts";
import { BASE_URL, CHECKED_URLS, fakeSite, HEALTHY } from "./smoke-test-kit.ts";

test.each(CHECKED_URLS)(
  "smokeChecks waits for %s before continuing",
  async (pausedUrl) => {
    const site = fakeSite(HEALTHY);
    const reached = Promise.withResolvers<void>();
    const ready = Promise.withResolvers<void>();
    const sequentialFetch: SmokeFetch = async (
      url: string,
      init: RequestInit,
    ) => {
      const response = await site.fetch(url, init);
      if (url === pausedUrl) {
        reached.resolve();
        await ready.promise;
      }
      return response;
    };
    const result = smokeChecks(BASE_URL, sequentialFetch);

    try {
      await reached.promise;
      expect(site.requests.map(({ url }) => url)).toEqual(
        CHECKED_URLS.slice(0, CHECKED_URLS.indexOf(pausedUrl) + 1),
      );
    } finally {
      ready.resolve();
    }
    await expect(result).resolves.toEqual([]);
  },
);

test.each(["GET /signup", "GET /setup"])(
  "smokeChecks finishes reading %s before the next request",
  async (key) => {
    const site = fakeSite(HEALTHY);
    const reading = Promise.withResolvers<void>();
    const body = Promise.withResolvers<string>();
    const pausedUrl = `${BASE_URL}${key.slice("GET ".length)}`;
    const sequentialFetch: SmokeFetch = async (
      url: string,
      init: RequestInit,
    ) => {
      const response = await site.fetch(url, init);
      if (url === pausedUrl) {
        response.text = (): Promise<string> => {
          reading.resolve();
          return body.promise;
        };
      }
      return response;
    };
    const result = smokeChecks(BASE_URL, sequentialFetch);

    try {
      await reading.promise;
      expect(site.requests.map(({ url }) => url)).toEqual(
        CHECKED_URLS.slice(0, CHECKED_URLS.indexOf(pausedUrl) + 1),
      );
    } finally {
      body.resolve(HEALTHY[key]?.body ?? "");
    }
    await expect(result).resolves.toEqual([]);
  },
);

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
