// The buddies' pages were at /personas until #115: old links and bookmarks
// are sent on, permanently, to the same page at /buddies, query and all
// (next.config.ts).
import { expect } from "@playwright/test";
import { HTTP_STATUS } from "@/http-status.ts";
import { PERSONAS_COPY } from "@/ui/copy/personas.ts";
import { test } from "./fixtures.ts";
import { logIn } from "./log-in.ts";

const LIST: RegExp = /\/buddies$/u;
const PAGE_WITH_QUERY: RegExp = /\/buddies\/mr-tee\?x=1$/u;

test.describe("use_case_view_buddies", () => {
  test("old /personas addresses redirect to /buddies", async ({
    account,
    page,
    request,
  }) => {
    await test.step("the list's old address answers 308 to /buddies", async () => {
      const response = await request.get("/personas", { maxRedirects: 0 });
      expect(response.status()).toBe(HTTP_STATUS.permanentRedirect);
      expect(response.headers()).toHaveProperty(
        "location",
        expect.stringMatching(LIST),
      );
    });

    await test.step("a page's old address keeps its id and query", async () => {
      const response = await request.get("/personas/mr-tee?x=1", {
        maxRedirects: 0,
      });
      expect(response.status()).toBe(HTTP_STATUS.permanentRedirect);
      expect(response.headers()).toHaveProperty(
        "location",
        expect.stringMatching(PAGE_WITH_QUERY),
      );
    });

    await test.step("signed in, the old address lands on the buddies", async () => {
      await logIn(page, account);
      await page.goto("/personas");
      await expect(page).toHaveURL("/buddies");
      await expect(
        page.getByRole("heading", { level: 1, name: PERSONAS_COPY.heading }),
      ).toBeVisible();
    });
  });
});
