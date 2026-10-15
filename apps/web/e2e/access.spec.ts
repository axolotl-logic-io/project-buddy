import { expect } from "@playwright/test";
import { DEFAULT_BUDDY_ID } from "@/buddies/index.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { CHAT_COPY } from "@/ui/copy/chat.ts";
import { LOGIN_COPY } from "@/ui/copy/login.ts";
import { SIGNUP_COPY } from "@/ui/copy/signup.ts";
import { SITE_COPY } from "@/ui/copy/site.ts";
import { THEME_COPY } from "@/ui/copy/theme.ts";
import { buddyName } from "./chat-page.ts";
import { test } from "./fixtures.ts";
import { signInByLink } from "./sign-in-pages.ts";

test("use_case_visit_signed_out", async ({ page, request }) => {
  await test.step("a page shows the sign-in page instead", async () => {
    await page.goto("/");

    await expect(page).toHaveURL("/login");
    await expect(
      page.getByRole("heading", { level: 1, name: SITE_COPY.name }),
    ).toBeVisible();
    await expect(page.getByRole("textbox")).toHaveCount(1);
    await expect(
      page.getByRole("textbox", { name: LOGIN_COPY.emailLabel }),
    ).toBeVisible();
    await expect(page.getByLabel(SIGNUP_COPY.inviteCodeLabel)).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: LOGIN_COPY.signUpLink }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: THEME_COPY.picker }),
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
  const chat = await testData.chat(await testData.project());
  await signInByLink(page, account.email);
  await page.close();

  await test.step("a bookmarked chat opens without signing in again", async () => {
    const later = await context.newPage();
    await later.goto(`/chats/${chat.id}`);

    await expect(later).toHaveURL(`/chats/${chat.id}`);
    await expect(
      later.getByRole("heading", {
        level: 1,
        name: CHAT_COPY.heading(buddyName(DEFAULT_BUDDY_ID)),
      }),
    ).toBeVisible();
    await expect(
      later.getByRole("textbox", { name: LOGIN_COPY.emailLabel }),
    ).toHaveCount(0);
  });
});
