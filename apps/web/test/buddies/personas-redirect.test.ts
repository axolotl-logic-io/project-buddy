// "use_case_view_buddies" in use-cases/buddies.md: the buddies' pages were
// at /personas until #115, and old links and bookmarks are sent on,
// permanently, to the same page at /buddies. Next itself carries the
// query over.
import { describe, expect, test } from "vitest";
import nextConfig from "../../next.config.ts";

describe("use_case_view_buddies", () => {
  test("old /personas addresses redirect permanently to /buddies", async () => {
    expect(await nextConfig.redirects?.()).toEqual(
      expect.arrayContaining([
        { source: "/personas", destination: "/buddies", permanent: true },
        {
          source: "/personas/:id",
          destination: "/buddies/:id",
          permanent: true,
        },
      ]),
    );
  });
});
