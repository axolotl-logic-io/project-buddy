import { expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import LoginPage from "@/app/login/page.tsx";
import { LOGIN_COPY } from "@/ui/copy/login.ts";

vi.mock("@/app/login/actions.ts", () => ({ requestSignInLinkAction: vi.fn() }));
test("invited new users are directed to their setup email with invitation help available", async () => {
  await render(<LoginPage />);
  await expect
    .element(page.getByText(LOGIN_COPY.signUpPrompt, { exact: false }))
    .toBeVisible();
  await expect
    .element(page.getByRole("link", { name: LOGIN_COPY.signUpLink }))
    .toHaveAttribute("href", "/signup");
  expect(LOGIN_COPY.signUpPrompt).toContain(
    "setup link in your invitation email",
  );
});
