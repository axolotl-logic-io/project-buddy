import { expect, type Locator, type Page } from "@playwright/test";
import { MAX_FAILED_LOGINS } from "@/auth/failed-logins.ts";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from "@/auth/session-token.ts";
import { readSitePassphrase } from "@/env.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { DEFAULT_PERSONA_ID } from "@/personas/index.ts";
import { COPY } from "@/ui/copy.ts";
import { personaName } from "./chat-page.ts";
import { test } from "./fixtures.ts";
import { logIn, submitPassphrase } from "./log-in.ts";

const WRONG_PASSPHRASE = "not the passphrase";
const MS_PER_SECOND = 1000;
// How far the session cookie's expiry may be from 30 days after the test
// signed in: the time the sign-in itself took.
const EXPIRY_TOLERANCE_SECONDS = 60;

// The form's answer to a passphrase. Next's route announcer is an alert
// too, but outside the page's main content.
function loginAnswer(page: Page): Locator {
  return page.getByRole("main").getByRole("alert");
}

// Enters a wrong passphrase `attempts` times in a row, each one answered as
// wrong rather than locked out.
async function enterWrongPassphrases(
  page: Page,
  attempts: number,
): Promise<void> {
  if (attempts === 0) {
    return;
  }
  await submitPassphrase(page, WRONG_PASSPHRASE);
  await expect(loginAnswer(page)).toHaveText(COPY.login.wrongPassphrase);
  await enterWrongPassphrases(page, attempts - 1);
}

async function expectSignedOut(page: Page): Promise<void> {
  await page.goto("/projects");
  await expect(page).toHaveURL("/login");
  await expect(page.getByLabel(COPY.login.passphrase)).toBeVisible();
}

test("use_case_visit_signed_out", async ({ page, request }) => {
  await test.step("a page asks for the passphrase instead", async () => {
    await page.goto("/");

    await expect(page).toHaveURL("/login");
    await expect(
      page.getByRole("heading", { level: 1, name: COPY.site.name }),
    ).toBeVisible();
    await expect(page.getByLabel(COPY.login.passphrase)).toBeVisible();
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

test("use_case_login_success", async ({ page, context }) => {
  await test.step("earlier wrong passphrases don't stop her", async () => {
    await enterWrongPassphrases(page, MAX_FAILED_LOGINS - 1);
  });

  await test.step("the passphrase opens the home page", async () => {
    await logIn(page);

    await expect(
      page.getByRole("link", { name: COPY.home.projectsLink }),
    ).toHaveAttribute("href", "/projects");
  });

  await test.step("other pages open without the passphrase", async () => {
    await page.goto("/projects");

    await expect(page).toHaveURL("/projects");
    await expect(
      page.getByRole("heading", { level: 1, name: COPY.projects.heading }),
    ).toBeVisible();
  });

  await test.step("the sign-in lasts 30 days", async () => {
    const session = (await context.cookies()).find(
      ({ name }) => name === SESSION_COOKIE_NAME,
    );
    const expectedExpiry = Date.now() / MS_PER_SECOND + SESSION_MAX_AGE_SECONDS;

    expect(session?.expires).toBeGreaterThan(
      expectedExpiry - EXPIRY_TOLERANCE_SECONDS,
    );
    expect(session?.expires).toBeLessThan(
      expectedExpiry + EXPIRY_TOLERANCE_SECONDS,
    );
  });

  await test.step("the earlier wrong passphrases no longer count", async () => {
    await context.clearCookies();
    // Had the earlier failures counted, these would reach the lockout.
    await enterWrongPassphrases(page, MAX_FAILED_LOGINS - 1);

    await logIn(page);
  });
});

test("use_case_login_wrong_passphrase", async ({ page }) => {
  await test.step("the site says the passphrase is wrong", async () => {
    await submitPassphrase(page, WRONG_PASSPHRASE);

    await expect(page).toHaveURL("/login");
    await expect(loginAnswer(page)).toHaveText(COPY.login.wrongPassphrase);
    await expect(page.getByLabel(COPY.login.passphrase)).toBeVisible();
  });

  await test.step("other pages still ask for the passphrase", async () => {
    await expectSignedOut(page);
  });
});

// The fixtures give every test's browser its own client address, and the
// lockout counts failures per address, so this test locks out only itself.
test("use_case_login_locked_out", async ({ page }) => {
  await test.step("she gets the passphrase wrong five times", async () => {
    await enterWrongPassphrases(page, MAX_FAILED_LOGINS);
  });

  await test.step("even the right passphrase is refused", async () => {
    await submitPassphrase(page, readSitePassphrase());

    await expect(page).toHaveURL("/login");
    await expect(loginAnswer(page)).toHaveText(COPY.login.lockedOut);
  });

  await test.step("she is still signed out", async () => {
    await expectSignedOut(page);
  });
});

test("use_case_return_signed_in", async ({ context, page, testData }) => {
  const chat = await testData.chat(await testData.project());
  await logIn(page);
  await page.close();

  await test.step("a bookmarked chat opens without the passphrase", async () => {
    const later = await context.newPage();
    await later.goto(`/chats/${chat.id}`);

    await expect(later).toHaveURL(`/chats/${chat.id}`);
    await expect(
      later.getByRole("heading", {
        level: 1,
        name: COPY.chat.heading(personaName(DEFAULT_PERSONA_ID)),
      }),
    ).toBeVisible();
    await expect(later.getByLabel(COPY.login.passphrase)).toHaveCount(0);
  });
});
