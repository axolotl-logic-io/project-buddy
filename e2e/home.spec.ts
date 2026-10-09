import { expect, test } from "@playwright/test";

test("home page introduces Project Buddy", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("Project Buddy");
  await expect(
    page.getByRole("heading", { level: 1, name: "Project Buddy" }),
  ).toBeVisible();
});

test("footer credits the Blender Reference Manual under CC BY-SA 4.0", async ({
  page,
}) => {
  await page.goto("/");

  const footer = page.getByRole("contentinfo");
  await expect(
    footer.getByRole("link", { name: "Blender Reference Manual" }),
  ).toHaveAttribute("href", "https://docs.blender.org/manual/en/latest/");
  await expect(
    footer.getByRole("link", { name: "CC BY-SA 4.0" }),
  ).toHaveAttribute("href", "https://creativecommons.org/licenses/by-sa/4.0/");
});
