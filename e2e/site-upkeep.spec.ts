import { expect } from "@playwright/test";
import { test } from "./fixtures.ts";

test("use_case_see_manual_credit", async ({ page }) => {
  await page.goto("/login");

  const footer = page.getByRole("contentinfo");
  await expect(
    footer.getByRole("link", { name: "Blender Reference Manual" }),
  ).toHaveAttribute("href", "https://docs.blender.org/manual/en/latest/");
  await expect(
    footer.getByRole("link", { name: "CC BY-SA 4.0" }),
  ).toHaveAttribute("href", "https://creativecommons.org/licenses/by-sa/4.0/");
});
