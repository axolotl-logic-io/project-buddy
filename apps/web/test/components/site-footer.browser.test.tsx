import { expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import LoginPage from "@/app/login/page.tsx";
import NotFound from "@/app/not-found.tsx";
import Home from "@/app/page.tsx";
import { FOOTER_COPY } from "@/ui/copy/footer.ts";
import { inSiteFrame } from "../app/site-frame-test-kit.tsx";
import {
  SIGNED_IN_USER,
  signInAs,
  signOut,
} from "../auth/current-user-test-kit.ts";

vi.mock(
  "@/auth/current-user.ts",
  () => import("../auth/current-user-test-kit.ts"),
);
// The rendered controls do not submit Server Actions in this footer case.
vi.mock("@/app/login/actions.ts", () => ({ requestLoginLinkAction: vi.fn() }));
vi.mock("@/themes/save-theme-choice-action.ts", () => ({
  saveThemeChoiceAction: vi.fn(),
}));

test("use_case_see_manual_credit", async () => {
  signOut();
  const login = await inSiteFrame(<LoginPage />);
  const missing = await inSiteFrame(<NotFound />);
  signInAs(SIGNED_IN_USER);
  const home = await inSiteFrame(<Home />);
  // Render the actual shared frame for public and signed-in pages. Inspect
  // attribution destinations without visiting either external site.
  const frames = [login, missing, home];
  await render(
    <>
      {login}
      {missing}
      {home}
    </>,
  );
  const footers = page.getByRole("contentinfo").all();
  expect(footers).toHaveLength(frames.length);
  await Promise.all(
    footers.map(async (footer) => {
      await expect.element(footer).toBeVisible();
      const manual = footer.getByRole("link", {
        name: FOOTER_COPY.manual,
        exact: true,
      });
      const license = footer.getByRole("link", {
        name: FOOTER_COPY.license,
        exact: true,
      });
      await expect.element(manual).toBeVisible();
      await expect
        .element(manual)
        .toHaveAttribute("href", "https://docs.blender.org/manual/en/latest/");
      await expect.element(license).toBeVisible();
      await expect
        .element(license)
        .toHaveAttribute(
          "href",
          "https://creativecommons.org/licenses/by-sa/4.0/",
        );
      await expect.element(license).toHaveAttribute("rel", "license");
      expect(footer.getByRole("link").elements()).toHaveLength(2);
      expect(footer.element().previousElementSibling?.tagName).toBe("MAIN");
    }),
  );
});
