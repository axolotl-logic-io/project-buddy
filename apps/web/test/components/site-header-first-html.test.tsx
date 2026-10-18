// use_case_use_on_phone, the signed-in header: its links come in the page's
// first HTML, not streamed in after it (`header-links-slot`). The header is
// rendered to static HTML, which is what the server sends before any
// JavaScript runs, so a link only the client renders is missing from it.
// site-header.browser.test.tsx checks how the header is laid out on phones
// and laptops, in every theme.
import { within } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, test, vi } from "vitest";
import HeaderLinks from "@/app/@header/[...path]/page.tsx";
import HomeHeaderLinks from "@/app/@header/page.tsx";
import { SignedInLinks, SiteHeader } from "@/components/site-header.tsx";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";
import { BUDDIES_COPY } from "@/ui/copy/buddies.ts";
import { CHAT_COPY } from "@/ui/copy/chat.ts";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";
import { SETTINGS_COPY } from "@/ui/copy/settings.ts";
import { SITE_COPY } from "@/ui/copy/site.ts";
import { SIGNED_IN_USER, signInAs } from "../auth/current-user-test-kit.ts";

vi.mock(
  "@/auth/current-user.ts",
  () => import("../auth/current-user-test-kit.ts"),
);

// The slot's loading states, of which it has none, so the header waits for
// the session and arrives whole.
const SLOT_LOADING_STATES = import.meta.glob("/src/app/@header/**/loading.tsx");

// A link as the first HTML has it.
interface HeaderLink {
  readonly name: string;
  readonly href: string | null;
}

// The signed-in header's links, in order.
const SIGNED_IN_HEADER_LINKS: readonly HeaderLink[] = [
  { name: SITE_COPY.name, href: "/" },
  { name: CHAT_COPY.headerLink, href: "/chat" },
  { name: PROJECTS_COPY.headerLink, href: "/projects" },
  { name: BUDDIES_COPY.headerLink, href: "/buddies" },
  { name: SETTINGS_COPY.headerLink, href: "/settings" },
  { name: ACCOUNT_COPY.headerLink, href: "/account" },
];

// The links of the banner in the HTML, parsed as a browser would without
// running any script.
function bannerLinks(html: string): readonly HeaderLink[] {
  const container = document.createElement("div");
  container.innerHTML = html;
  return within(container)
    .getAllByRole("link")
    .map((link) => ({
      name: link.textContent,
      href: link.getAttribute("href"),
    }));
}

beforeEach(() => {
  signInAs(SIGNED_IN_USER);
});

describe("use_case_use_on_phone", () => {
  test("the signed-in header's first HTML has its links, in order", async () => {
    const html = renderToStaticMarkup(
      <SiteHeader links={await SignedInLinks()} />,
    );

    expect(bannerLinks(html)).toEqual(SIGNED_IN_HEADER_LINKS);
  });

  test.each([
    ["the home page", HomeHeaderLinks],
    ["every other page", HeaderLinks],
  ])("the header slot renders the signed-in links on %s", (_page, slot) => {
    expect(slot().type).toBe(SignedInLinks);
  });

  test("the header slot has no loading state", () => {
    expect(Object.keys(SLOT_LOADING_STATES)).toEqual([]);
  });
});
