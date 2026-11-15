import { expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { requestSignInLinkAction } from "@/app/login/actions.ts";
import LoginPage from "@/app/login/page.tsx";
import { LOGIN_COPY } from "@/ui/copy/login.ts";

vi.mock("@/app/login/actions.ts", () => ({ requestSignInLinkAction: vi.fn() }));
// The sign-in page, reached with searchParams.
async function signInPage(
  searchParams: Record<string, string> = {},
): Promise<void> {
  await render(
    await LoginPage({
      params: Promise.resolve({}),
      searchParams: Promise.resolve(searchParams),
    }),
  );
}

test("new users can reach sign-up from the login page", async () => {
  await signInPage();
  await expect
    .element(page.getByText(LOGIN_COPY.signUpPrompt, { exact: false }))
    .toBeVisible();
  await expect
    .element(page.getByRole("link", { name: LOGIN_COPY.signUpLink }))
    .toHaveAttribute("href", "/signup");
});

test("a sign-in page reached from a timer link asks for a link that leads back to it", async () => {
  vi.mocked(requestSignInLinkAction).mockResolvedValue({
    kind: "sent",
    message: LOGIN_COPY.checkEmail,
    email: "wren@example.test",
  });
  await signInPage({ next: "/timer/25/15/0" });
  await page
    .getByRole("textbox", { name: LOGIN_COPY.emailLabel })
    .fill("wren@example.test");
  await page.getByRole("button", { name: LOGIN_COPY.send }).click();

  await expect.element(page.getByText(LOGIN_COPY.checkEmail)).toBeVisible();
  const [, form] = vi.mocked(requestSignInLinkAction).mock.lastCall ?? [];
  expect(form?.get("next")).toBe("/timer/25/15/0");
});
