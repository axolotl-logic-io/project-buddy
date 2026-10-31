import type { JSX } from "react";
import { describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import CreditsPage from "@/app/credits/page.tsx";
import LoginPage from "@/app/login/page.tsx";
import NotFound from "@/app/not-found.tsx";
import Home from "@/app/page.tsx";
import { CREDITS_COPY } from "@/ui/copy/credits.ts";
import {
  SIGNED_IN_USER,
  signInAs,
  signOut,
} from "../../auth/current-user-test-kit.ts";
import { tabForward } from "../../components/keyboard-test-kit.ts";
import { openMenu } from "../../components/site-menu-test-kit.ts";
import { inSiteFrame } from "../site-frame-test-kit.tsx";

vi.mock(
  "@/auth/current-user.ts",
  () => import("../../auth/current-user-test-kit.ts"),
);
// The rendered controls do not submit Server Actions in this case.
vi.mock("@/app/login/actions.ts", () => ({ requestSignInLinkAction: vi.fn() }));
vi.mock("@/themes/save-theme-choice-action.ts", () => ({
  saveThemeChoiceAction: vi.fn(),
}));

// Pages whose site menu offers Credits: public pages for a visitor, and a
// signed-in page.
const PAGES: readonly {
  name: string;
  signedIn: boolean;
  content: () => JSX.Element;
}[] = [
  { name: "the sign-in page", signedIn: false, content: () => <LoginPage /> },
  { name: "the not-found page", signedIn: false, content: () => <NotFound /> },
  { name: "the home page", signedIn: true, content: () => <Home /> },
];

// Stops a clicked link from leaving the test's page.
function stayOnThisPage(event: MouseEvent): void {
  event.preventDefault();
}

describe("use_case_see_manual_credit", () => {
  for (const { name, signedIn, content } of PAGES) {
    test(`the site menu on ${name} links to Credits, and following it closes the menu`, async () => {
      signOut();
      if (signedIn) {
        signInAs(SIGNED_IN_USER);
      }
      await render(await inSiteFrame(content()));
      expect(page.getByRole("contentinfo").query()).toBeNull();
      await openMenu();
      const credits = page
        .getByRole("dialog")
        .getByRole("link", { name: CREDITS_COPY.menuLink, exact: true });
      await expect.element(credits).toBeVisible();
      await expect.element(credits).toHaveAttribute("href", "/credits");

      // Keep the test's page: the link's own navigation is Next's to test.
      globalThis.addEventListener("click", stayOnThisPage, { capture: true });
      try {
        await credits.click();
        await expect.poll(() => page.getByRole("dialog").query()).toBeNull();
      } finally {
        globalThis.removeEventListener("click", stayOnThisPage, {
          capture: true,
        });
      }
    });
  }

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
});
