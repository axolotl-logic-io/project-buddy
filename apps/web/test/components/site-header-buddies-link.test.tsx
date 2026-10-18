// "use_case_view_buddies" in use-cases/buddies.md: she goes to her buddies
// by the header's Buddies link, from any signed-in page. Both pages of the
// root layout's @header slot, the home page's and every other page's, give
// the header SignedInLinks, so checking that once covers every signed-in
// page.
import { render, screen, within } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import HeaderLinks from "@/app/@header/[...path]/page.tsx";
import HomeHeaderLinks from "@/app/@header/page.tsx";
import { SignedInLinks, SiteHeader } from "@/components/site-header.tsx";
import { BUDDIES_COPY } from "@/ui/copy/buddies.ts";
import { SIGNED_IN_USER, signInAs } from "../auth/current-user-test-kit.ts";

vi.mock(
  "@/auth/current-user.ts",
  () => import("../auth/current-user-test-kit.ts"),
);

describe("use_case_view_buddies", () => {
  test("the header links to her buddies when she is signed in", async () => {
    signInAs(SIGNED_IN_USER);

    render(<SiteHeader links={await SignedInLinks()} />);

    expect(
      within(screen.getByRole("banner")).getByRole("link", {
        name: BUDDIES_COPY.headerLink,
      }),
    ).toHaveAttribute("href", "/buddies");
  });

  test("every page's header has the signed-in links", () => {
    expect(HomeHeaderLinks().type).toBe(SignedInLinks);
    expect(HeaderLinks().type).toBe(SignedInLinks);
  });
});
