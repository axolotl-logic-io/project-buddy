// Every Playwright test (e2e/) and screenshot runs in the browser server of
// compose.browsers.yml (`os-neutral-browsers`). Playwright refuses a server
// of another version, so its image and the Playwright it starts must be the
// version package-lock.json installs. Baselines carry no platform suffix,
// because every host renders them in the same image.
import { describe, expect, test } from "vitest";
import packageLock from "../../../package-lock.json" with { type: "json" };
import compose from "../compose.browsers.yml?raw";

const LOCKED: string =
  packageLock.packages["node_modules/@playwright/test"].version;

const IMAGE_VERSION = /mcr\.microsoft\.com\/playwright:v(?<version>[\d.]+)-/u;
const SERVER_VERSION = /"playwright@(?<version>[\d.]+)"/u;

const PLATFORM_BASELINES = Object.keys(
  import.meta.glob("/e2e/**/*-snapshots/*-{darwin,linux,win32}.png"),
);

describe("the browser server", () => {
  test("runs the image of the locked Playwright version", () => {
    const { version } = IMAGE_VERSION.exec(compose)?.groups ?? {};
    expect(version).toBe(LOCKED);
  });

  test("starts the locked Playwright version", () => {
    const { version } = SERVER_VERSION.exec(compose)?.groups ?? {};
    expect(version).toBe(LOCKED);
  });

  test("leaves no baseline named for a platform", () => {
    expect(PLATFORM_BASELINES).toStrictEqual([]);
  });
});
