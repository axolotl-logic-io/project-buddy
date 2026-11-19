import { NextRequest } from "next/server";
import { expect, test } from "vitest";
import { PUT } from "@/app/api/appearance/route.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { proxy } from "@/proxy.ts";
import { APPEARANCE_PREFERENCE_PATH } from "@/themes/theme-choice.ts";

const SITE = "http://localhost:3000";

function preference(origin: string, mode: string): NextRequest {
  return new NextRequest(new URL(APPEARANCE_PREFERENCE_PATH, SITE), {
    method: "PUT",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify({ theme: "parchment", mode }),
  });
}

test("a signed-out visitor can save an appearance on browsers without Cookie Store", async () => {
  expect((await proxy(preference(SITE, "dark"))).status).toBe(HTTP_STATUS.ok);
  const response = await PUT(preference(SITE, "dark"));
  expect(response.status).toBe(HTTP_STATUS.noContent);
  const cookie = response.headers.get("set-cookie");
  expect(cookie).toContain("theme=parchment.dark");
  expect(cookie).toContain("Path=/");
  expect(cookie?.toLowerCase()).toContain("samesite=lax");
});

test("refuses other origins and unknown appearances", async () => {
  const [foreign, invalid] = await Promise.all([
    PUT(preference("https://elsewhere.example", "dark")),
    PUT(preference(SITE, "unknown")),
  ]);
  expect(foreign.status).toBe(HTTP_STATUS.forbidden);
  expect(foreign.headers.has("set-cookie")).toBe(false);
  expect(invalid.status).toBe(HTTP_STATUS.badRequest);
  expect(invalid.headers.has("set-cookie")).toBe(false);
});
