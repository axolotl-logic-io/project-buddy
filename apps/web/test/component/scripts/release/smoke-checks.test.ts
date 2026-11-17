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

test.each(["ivory-vellum", "soot-brass", "espresso-leather"])(
  "requires the %s material to be publicly served as WebP",
  async (material) => {
    const path = `/textures/${material}.webp`;
    const failures = await smokeChecks(
      "https://example.test",
      (url: string): Promise<Response> => {
        if (new URL(url).pathname === path) {
          return Promise.resolve(
            new Response("sign in", {
              headers: { "content-type": "text/html" },
            }),
          );
        }
        return Promise.resolve(new Response(null, { status: 503 }));
      },
    );
    expect(failures).toContain(`GET ${path}: expected a WebP image`);
  },
);

test("reads or cancels every response body, so no connection stays open", async () => {
  const responses: Response[] = [];
  await smokeChecks("https://example.test", (): Promise<Response> => {
    const response = new Response("body", { status: 200 });
    responses.push(response);
    return Promise.resolve(response);
  });
  expect(responses.length).toBeGreaterThan(0);
  expect(responses.filter((response) => !response.bodyUsed)).toEqual([]);
});
