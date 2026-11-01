import { describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import CreditsPage from "@/app/credits/page.tsx";
import LoginPage from "@/app/login/page.tsx";
import NotFound from "@/app/not-found.tsx";
import { CREDITS_COPY } from "@/ui/copy/credits.ts";
import { SITE_MENU_COPY } from "@/ui/copy/site.ts";
import { inSiteFrame } from "../app/site-frame-test-kit.tsx";
import {
  SIGNED_IN_USER,
  signInAs,
  signOut,
} from "../auth/current-user-test-kit.ts";
import { tabForward } from "./keyboard-test-kit.ts";
import { closeMenu, openMenu } from "./site-menu-test-kit.ts";

vi.mock(
  "@/auth/current-user.ts",
  () => import("../auth/current-user-test-kit.ts"),
);
// The rendered controls do not submit Server Actions in these navigation cases.
vi.mock("@/app/login/actions.ts", () => ({ requestSignInLinkAction: vi.fn() }));
vi.mock("@/themes/save-theme-choice-action.ts", () => ({
  saveThemeChoiceAction: vi.fn(),
}));

describe("use_case_see_manual_credit", () => {
  for (const Subject of [LoginPage, NotFound, CreditsPage]) {
    test(`Credits is in the menu on ${Subject.name}`, async () => {
      signOut();
      if (Subject === CreditsPage) {
        signInAs(SIGNED_IN_USER);
      }
      await render(await inSiteFrame(<Subject />));
      await openMenu();
      await expect
        .element(
          page.getByRole("dialog").getByRole("link", {
            name: SITE_MENU_COPY.credits,
            exact: true,
          }),
        )
        .toHaveAttribute("href", "/credits");
      await closeMenu();
      expect(page.getByRole("contentinfo").query()).toBeNull();
    });
  }
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
  });
}
