import { expect } from "@playwright/test";
import { HTTP_STATUS } from "@/http-status.ts";
import { test } from "./fixtures.ts";

test("use_case_visit_signed_out", async ({ page, request }) => {
  await test.step("a page asks for the passphrase instead", async () => {
    await page.goto("/");

    await expect(page).toHaveURL("/login");
    await expect(
      page.getByRole("heading", { level: 1, name: "Project Buddy" }),
    ).toBeVisible();
    await expect(page.getByLabel("Passphrase")).toBeVisible();
  });

  await test.step("a call to the site's data is refused", async () => {
    const response = await request.get("/api/anything");

    expect(response.status()).toBe(HTTP_STATUS.unauthorized);
  });
});
