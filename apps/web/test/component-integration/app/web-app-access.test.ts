// Installing the app and showing its notifications needs files that phones
// fetch without the session cookie: the web app manifest, the service
// worker and the icons. The paper texture also dresses public pages.
// The proxy, which sends a visitor without a session
// to sign in, never sees them; it still guards every page.
import { unstable_doesMiddlewareMatch as doesProxyMatch } from "next/experimental/testing/server";
import { expect, test } from "vitest";
import { config } from "@/proxy.ts";
import { APP_ICONS } from "@/ui/web-app.ts";

const PUBLIC_FILES: readonly string[] = [
  "/manifest.webmanifest",
  "/sw.js",
  "/textures/parchment.svg",
  APP_ICONS.small.src,
  APP_ICONS.large.src,
  APP_ICONS.apple.src,
];

test("public app assets and paper textures are served without a session", () => {
  for (const path of PUBLIC_FILES) {
    expect(
      doesProxyMatch({ config, url: `http://localhost${path}` }),
      path,
    ).toBe(false);
  }
});

test("the pages around them still need a session", () => {
  for (const path of [
    "/",
    "/settings",
    "/sw.json",
    "/iconsettings",
    "/texturesettings",
    "/api/images/private",
  ]) {
    expect(
      doesProxyMatch({ config, url: `http://localhost${path}` }),
      path,
    ).toBe(true);
  }
});
