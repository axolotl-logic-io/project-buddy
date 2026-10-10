import { expect, test } from "@playwright/test";

test("home page redirects to the passphrase login without a session", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page).toHaveURL("/login");
  await expect(
    page.getByRole("heading", { level: 1, name: "Project Buddy" }),
  ).toBeVisible();
  await expect(page.getByLabel("Passphrase")).toBeVisible();
});

test("API routes answer 401 without a session", async ({ request }) => {
  const response = await request.get("/api/anything");

  expect(response.status()).toBe(401);
});

test("footer credits the Blender Reference Manual under CC BY-SA 4.0", async ({
  page,
}) => {
  await page.goto("/login");

  const footer = page.getByRole("contentinfo");
  await expect(
    footer.getByRole("link", { name: "Blender Reference Manual" }),
  ).toHaveAttribute("href", "https://docs.blender.org/manual/en/latest/");
  await expect(
    footer.getByRole("link", { name: "CC BY-SA 4.0" }),
  ).toHaveAttribute("href", "https://creativecommons.org/licenses/by-sa/4.0/");
});
