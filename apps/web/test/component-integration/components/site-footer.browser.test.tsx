import { expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import CreditsPage from "@/app/credits/page.tsx";
import LoginPage from "@/app/login/page.tsx";
import NotFound from "@/app/not-found.tsx";
import { CREDITS_COPY } from "@/ui/copy/credits.ts";
import { FOOTER_COPY } from "@/ui/copy/footer.ts";
import { inSiteFrame } from "../app/site-frame-test-kit.tsx";
import {
  SIGNED_IN_USER,
  signInAs,
  signOut,
} from "../auth/current-user-test-kit.ts";
import { tabForward } from "./keyboard-test-kit.ts";

vi.mock(
  "@/auth/current-user.ts",
  () => import("../auth/current-user-test-kit.ts"),
);
// The rendered controls do not submit Server Actions in this footer case.
vi.mock("@/app/login/actions.ts", () => ({ requestSignInLinkAction: vi.fn() }));
vi.mock("@/themes/save-theme-choice-action.ts", () => ({
  saveThemeChoiceAction: vi.fn(),
}));

test("use_case_see_manual_credit", async () => {
  signOut();
  const login = await inSiteFrame(<LoginPage />);
  const missing = await inSiteFrame(<NotFound />);
  signInAs(SIGNED_IN_USER);
  const signedIn = await inSiteFrame(<CreditsPage />);
  // Render the shared frame for public and signed-in pages.
  const frames = [login, missing, signedIn];
  await render(
    <>
      {login}
      {missing}
      {signedIn}
    </>,
  );
  const footers = page.getByRole("contentinfo").all();
  expect(footers).toHaveLength(frames.length);
  await Promise.all(
    footers.map(async (footer) => {
      await expect.element(footer).toBeVisible();
      const credits = footer.getByRole("link", {
        name: FOOTER_COPY.credits,
        exact: true,
      });
      await expect.element(credits).toBeVisible();
      await expect.element(credits).toHaveAttribute("href", "/credits");
      expect(footer.getByRole("link").elements()).toHaveLength(1);
      expect(footer.element().previousElementSibling?.tagName).toBe("MAIN");
    }),
  );
});

for (const signedIn of [false, true]) {
  test(`Credits preserves attribution with signed in: ${signedIn}`, async () => {
    signOut();
    if (signedIn) {
      signInAs(SIGNED_IN_USER);
    }
    await render(await inSiteFrame(<CreditsPage />));
    await expect
      .element(page.getByRole("heading", { name: "Credits", exact: true }))
      .toBeVisible();
    await expect
      .element(
        page.getByText(
          "Includes content adapted from the Blender Reference Manual, licensed under CC BY-SA 4.0.",
          { exact: true },
        ),
      )
      .toBeVisible();
    await expect
      .element(page.getByRole("link", { name: CREDITS_COPY.manual }))
      .toHaveAttribute("href", "https://docs.blender.org/manual/en/latest/");
    const license = page.getByRole("link", { name: CREDITS_COPY.license });
    await expect
      .element(license)
      .toHaveAttribute(
        "href",
        "https://creativecommons.org/licenses/by-sa/4.0/",
      );
    await expect.element(license).toHaveAttribute("rel", "license");
    page.getByRole("link", { name: CREDITS_COPY.manual }).element().focus();
    await tabForward();
    await expect.element(license).toHaveFocus();
    await tabForward();
    await expect
      .element(
        page.getByRole("contentinfo").getByRole("link", { name: "Credits" }),
      )
      .toHaveFocus();
  });
}
