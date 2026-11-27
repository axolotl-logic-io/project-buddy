import type { JSX } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import CreditsPage from "@/app/(stream)/(site)/credits/page.tsx";
import LoginPage from "@/app/(stream)/(site)/login/page.tsx";
import NotFound from "@/app/(stream)/(site)/not-found.tsx";
import { CREDITS_COPY } from "@/ui/copy/credits.ts";
import { tabForward } from "../../../support/keyboard-test-kit.ts";
import {
  SIGNED_IN_USER,
  signInAs,
  signOut,
} from "../../auth/current-user-test-kit.ts";
import { openPanel } from "../../components/site-panel-test-kit.ts";
import { applyTheme } from "../../themes/theme-test-kit.ts";
import { inSiteFrame } from "../site-frame-test-kit.tsx";

// The signed-in header records visible visits and refreshes through the router.
vi.mock("next/navigation", () => import("../../components/router-test-kit.ts"));

// The header's ring of the user's circle reads their experience, server code.
vi.mock(
  "@/experience/experience-store.ts",
  () => import("../../experience/experience-store-test-kit.ts"),
);

vi.mock(
  "@/auth/current-user.ts",
  () => import("../../auth/current-user-test-kit.ts"),
);
// The rendered controls do not submit Server Actions in this case.
vi.mock("@/app/(stream)/(site)/login/actions.ts", () => ({
  requestSignInLinkAction: vi.fn(),
}));

// Pages whose site panel offers Credits: public pages for a visitor, and a
// signed-in page.
const PAGES: readonly {
  name: string;
  signedIn: boolean;
  content: () => JSX.Element | Promise<JSX.Element>;
}[] = [
  {
    name: "the sign-in page",
    signedIn: false,
    content: () =>
      LoginPage({
        params: Promise.resolve({}),
        searchParams: Promise.resolve({}),
      }),
  },
  { name: "the not-found page", signedIn: false, content: () => <NotFound /> },
  { name: "the Credits page", signedIn: true, content: () => <CreditsPage /> },
];

// Stops a clicked link from leaving the test's page.
function stayOnThisPage(event: MouseEvent): void {
  event.preventDefault();
}

beforeEach(() => {
  applyTheme("parchment");
});

describe("use_case_see_icon_credit", () => {
  for (const { name, signedIn, content } of PAGES) {
    test(`the site panel on ${name} links to Credits, and following it closes the panel`, async () => {
      signOut();
      if (signedIn) {
        signInAs(SIGNED_IN_USER);
      }
      await render(await inSiteFrame(await content()));
      expect(page.getByRole("contentinfo").query()).toBeNull();
      await openPanel();
      const credits = page
        .getByRole("dialog")
        .getByRole("link", { name: CREDITS_COPY.panelLink, exact: true });
      await expect.element(credits).toBeVisible();
      await expect.element(credits).toHaveAttribute("href", "/credits");

      // Stop the browser's navigation after React handles the click.
      globalThis.addEventListener("click", stayOnThisPage);
      try {
        await credits.click();
        await expect.poll(() => page.getByRole("dialog").query()).toBeNull();
      } finally {
        globalThis.removeEventListener("click", stayOnThisPage);
      }
    });
  }

  test("Credits preserves attribution for a signed-out visitor", async () => {
    signOut();
    await render(await inSiteFrame(<CreditsPage />));
    await expect
      .element(
        page.getByRole("heading", {
          name: CREDITS_COPY.heading,
          exact: true,
        }),
      )
      .toBeVisible();
    await expect
      .element(page.getByRole("link", { name: CREDITS_COPY.iconLibrary }))
      .toHaveAttribute("href", "https://lucide.dev");
    const iconLicense = page.getByRole("link", {
      name: CREDITS_COPY.iconLicense,
    });
    await expect
      .element(iconLicense)
      .toHaveAttribute("href", "/licenses/lucide.txt");
    await expect.element(iconLicense).toHaveAttribute("rel", "license");
    page
      .getByRole("link", { name: CREDITS_COPY.iconLibrary })
      .element()
      .focus();
    await tabForward();
    await expect.element(iconLicense).toHaveFocus();
  });
});
