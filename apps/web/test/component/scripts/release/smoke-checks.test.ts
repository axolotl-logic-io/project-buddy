import { expect, test } from "vitest";
import { smokeChecks } from "../../../../scripts/release/smoke-checks.ts";

test("rejects a public paper texture redirected to sign-in", async () => {
  const failures = await smokeChecks(
    "https://example.test",
    (url: string): Promise<Response> => {
      if (new URL(url).pathname === "/textures/parchment.svg") {
        return Promise.resolve(
          new Response(null, { status: 307, headers: { location: "/login" } }),
        );
      }
      return Promise.resolve(new Response(null, { status: 503 }));
    },
  );
  expect(failures).toContain(
    "GET /textures/parchment.svg: answered 307, expected 200",
  );
});
