import { expect } from "@playwright/test";
import { HTTP_STATUS } from "@/http-status.ts";
import { LOGIN_COPY } from "@/ui/copy/login.ts";
import { PROBLEMS_COPY } from "@/ui/copy/problems.ts";
import { SITE_COPY } from "@/ui/copy/site.ts";
import { test } from "./fixtures.ts";
import { signInByLink } from "./sign-in-pages.ts";

test("use_case_visit_signed_out", async ({ page, request }) => {
  await test.step("a page shows the sign-in page instead", async () => {
    await page.goto("/");

    await expect(page).toHaveURL("/login");
    await expect(
      page.getByRole("heading", { level: 1, name: SITE_COPY.name }),
    ).toBeVisible();
  });

  await test.step("so does an address that doesn't exist", async () => {
    await page.goto("/no-such-page");

    await expect(page).toHaveURL("/login");
  });

  await test.step("a call to the site's data is refused", async () => {
    const response = await request.get("/api/anything");

    expect(response.status()).toBe(HTTP_STATUS.unauthorized);
  });
});

test("use_case_return_signed_in", async ({
  account,
  context,
  page,
  testData,
}) => {
  const quest = await testData.quest();
  await signInByLink(page, account.email);
  await page.close();

  await test.step("a bookmarked quest opens without signing in again", async () => {
    const later = await context.newPage();
    const response = await later.goto(`/quests/${quest.id}`);
    const html = await response?.text();
    expect(html).toBeDefined();
    const shell = await later.evaluate((documentHtml) => {
      const initial = new DOMParser().parseFromString(
        documentHtml ?? "",
        "text/html",
      );
      const main = initial.querySelector("main");
      const header = initial.querySelector("header");
      const busyBand = header?.querySelector('[aria-busy="true"]');
      const status = Array.from(
        busyBand?.querySelectorAll("[role]") ?? [],
      ).find((element) => element.getAttribute("role") === "status");
      return {
        header: header?.textContent,
        status: status?.textContent,
        main: main?.textContent,
      };
    }, html);
    expect(shell.header).toContain(SITE_COPY.name);
    expect(shell.status).toBe(SITE_COPY.loading);
    expect(shell.main).toBe("");

    await expect(later).toHaveURL(`/quests/${quest.id}`);
    await expect(later.getByRole("main")).not.toBeEmpty();
    await expect(
      later.getByRole("region", { name: SITE_COPY.breadcrumbs }),
    ).not.toHaveAttribute("aria-busy");
    await expect(
      later.getByRole("heading", { level: 1, name: quest.name }),
    ).toBeVisible();
    await expect(
      later.getByRole("textbox", { name: LOGIN_COPY.emailLabel }),
    ).toHaveCount(0);

    await later.goto("/no-such-page");
    await expect(
      later.getByRole("heading", { name: PROBLEMS_COPY.notFoundHeading }),
    ).toBeVisible();
    await expect(later.getByRole("banner")).toBeVisible();
  });
});
