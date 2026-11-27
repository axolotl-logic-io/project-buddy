import { expect } from "@playwright/test";
import { LOGIN_COPY } from "@/ui/copy/login.ts";
import { SIGNUP_COPY } from "@/ui/copy/signup.ts";
import { SITE_COPY } from "@/ui/copy/site.ts";
import { test } from "./fixtures.ts";
import { waitForHydrated } from "./page-helpers.ts";

const SIGNUP_REQUEST = /\/signup(?:\?|$)/u;

test("use_case_change_auth_page", async ({ page }) => {
  const requested = Promise.withResolvers<void>();
  const release = Promise.withResolvers<void>();
  await page.route(SIGNUP_REQUEST, async (route) => {
    const response = await route.fetch();
    requested.resolve();
    await release.promise;
    await route.fulfill({ response });
  });

  const signUp = page.getByRole("link", { name: LOGIN_COPY.signUpLink });
  const band = page.getByRole("region", { name: SITE_COPY.breadcrumbs });
  const status = band.getByRole("status");
  const signInIntro = page.getByText(LOGIN_COPY.intro);
  const signUpIntro = page.getByText(SIGNUP_COPY.intro);
  try {
    await page.goto("/login");
    await waitForHydrated(signUp);
    await signUp.click({ noWaitAfter: true });
    await requested.promise;
    await expect(signInIntro).toBeVisible();
    await expect(signUpIntro).toHaveCount(0);
    await expect(band).toHaveAttribute("aria-busy", "true");
    await expect(status).toHaveText(SITE_COPY.loading);
    expect(
      await status.evaluate(
        (node) => getComputedStyle(node, "::after").animationName,
      ),
    ).not.toBe("none");

    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(
      await status.evaluate(
        (node) => getComputedStyle(node, "::after").animationName,
      ),
    ).toBe("none");
    await expect(status).toBeVisible();
  } finally {
    release.resolve();
  }

  await expect(signUpIntro).toBeVisible();
  await expect(signInIntro).toBeHidden();
  await expect(band).not.toHaveAttribute("aria-busy");
  await expect(status).toBeEmpty();

  await page.goBack();
  await expect(signInIntro).toBeVisible();
  await expect(band).not.toHaveAttribute("aria-busy");

  await page.goForward();
  await expect(signUpIntro).toBeVisible();
  await expect(band).not.toHaveAttribute("aria-busy");
});
