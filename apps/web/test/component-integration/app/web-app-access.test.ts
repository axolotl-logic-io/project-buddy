// Installed app assets and the temporary retirement worker remain public.

import { unstable_doesMiddlewareMatch as doesProxyMatch } from "next/experimental/testing/server";
import { NextRequest } from "next/server";
import { expect, test } from "vitest";
import { config, proxy } from "@/proxy.ts";
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

test("Stripe webhooks pass the cookie gate and authenticate in the route", async () => {
  const response = await proxy(
    new NextRequest("http://localhost/api/stripe", { method: "POST" }),
  );
  expect(response.headers.get("x-middleware-next")).toBe("1");
});
