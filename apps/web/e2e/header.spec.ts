// Kept in Playwright: it checks the server's first HTML, which needs a real server and session.
// use_case_use_on_phone, the signed-in header: its links come in the page's
// first HTML. site-header.browser.test.tsx checks how the header is laid
// out on phones and laptops, in every theme.
import { expect } from "@playwright/test";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";
import { BUDDIES_COPY } from "@/ui/copy/buddies.ts";
import { SETTINGS_COPY } from "@/ui/copy/settings.ts";
import { SITE_COPY } from "@/ui/copy/site.ts";
import { test } from "./fixtures.ts";
import { logIn } from "./log-in.ts";

test.describe("use_case_use_on_phone", () => {
  // The header's links come in the page's first HTML, not streamed in after
  // it: with JavaScript off, nothing streamed is swapped in, so the banner
  // has them only if the server sent them with the page.
  test.describe("the signed-in header arrives whole", () => {
    test.use({ javaScriptEnabled: false });

    for (const path of ["/", "/projects", "/settings"]) {
      test(`on ${path}`, async ({ page, testData }) => {
        await logIn(page, testData.account);
        await page.goto(path);
        await expect(page.getByRole("banner").getByRole("link")).toHaveText([
          SITE_COPY.name,
          BUDDIES_COPY.headerLink,
          SETTINGS_COPY.headerLink,
          ACCOUNT_COPY.headerLink,
        ]);
      });
    }
  });
});
