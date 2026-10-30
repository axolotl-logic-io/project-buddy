import { expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import BuddiesPage from "@/app/(workspace)/buddies/(list)/page.tsx";
import { listBuddies, type OwnBuddy } from "@/buddies/buddy-store.ts";
import { BUDDIES_COPY } from "@/ui/copy/buddies.ts";
import { HIPPY_CLONE } from "../app/phone-pages-fixtures.ts";
import { inWorkspace } from "../app/workspace-test-kit.tsx";
import { SIGNED_IN_USER, signInAs } from "../auth/current-user-test-kit.ts";
import { userBuddyIdFixture } from "../id-fixtures.ts";

vi.mock(
  "@/auth/current-user.ts",
  () => import("../auth/current-user-test-kit.ts"),
);
vi.mock("@/buddies/buddy-store.ts", () => ({
  listBuddies: vi.fn<typeof listBuddies>(),
}));
// Listing exposes these actions but never submits them in this UI case.
vi.mock("@/app/(workspace)/buddies/actions.ts", () => ({
  cloneBuddyAction: vi.fn(),
  editBuiltInBuddyAction: vi.fn(),
}));

const BUILT_INS = [
  { id: "hippy", name: "Hippy" },
  { id: "mr-tee", name: "Mr. Tee" },
  { id: "fjord-tines", name: "Fjord Tines" },
  { id: "span-tines", name: "Span Tines" },
  { id: "argon-sprangler", name: "Argon Sprangler" },
  { id: "roland-dustchain", name: "Roland Dustchain" },
];
// The store supplies oldest first; the page must retain that order, not
// sort by name. Database ownership and ordering remain server-test concerns.
const OWN_BUDDIES: OwnBuddy[] = [
  { ...HIPPY_CLONE, name: "Zebra guide" },
  {
    ...HIPPY_CLONE,
    id: userBuddyIdFixture("3d3e4f5a-6b7c-4d8e-9f0a-1b2c3d4e5f6a"),
    name: "Alpine guide",
    createdAt: new Date("2026-10-13T09:00:00Z"),
  },
];

test("use_case_view_buddies", async () => {
  signInAs(SIGNED_IN_USER);
  vi.mocked(listBuddies).mockResolvedValue(OWN_BUDDIES);
  const screen = await render(inWorkspace(await BuddiesPage()));
  const builtIn = page.getByRole("region", {
    name: BUDDIES_COPY.builtInHeading,
  });
  const own = page.getByRole("region", { name: BUDDIES_COPY.ownHeading });

  await expect
    .element(
      page.getByRole("heading", {
        level: 1,
        name: BUDDIES_COPY.heading,
      }),
    )
    .toBeVisible();
  expect(page.getByRole("region").elements()).toEqual([
    builtIn.element(),
    own.element(),
  ]);
  expect(builtIn.getByRole("listitem").elements()).toHaveLength(
    BUILT_INS.length,
  );
  await Promise.all(
    BUILT_INS.map(async (buddy) => {
      await expect
        .element(
          builtIn.getByRole("link", {
            name: buddy.name,
            exact: true,
          }),
        )
        .toHaveAttribute("href", `/buddies/${buddy.id}`);
      await expect
        .element(
          builtIn.getByRole("button", {
            name: BUDDIES_COPY.customizeLabel(buddy.name),
            exact: true,
          }),
        )
        .toBeEnabled();
    }),
  );
  expect(own.getByRole("listitem").elements()).toHaveLength(OWN_BUDDIES.length);
  expect(
    own
      .getByRole("link")
      .elements()
      .map((link) => link.textContent),
  ).toEqual([
    OWN_BUDDIES[0]?.name,
    BUDDIES_COPY.tweak,
    OWN_BUDDIES[1]?.name,
    BUDDIES_COPY.tweak,
  ]);
  await Promise.all(
    OWN_BUDDIES.map(async (buddy) => {
      await expect
        .element(
          own.getByRole("link", {
            name: buddy.name,
            exact: true,
          }),
        )
        .toHaveAttribute("href", `/buddies/${buddy.id}`);
      await expect
        .element(
          own.getByRole("link", {
            name: BUDDIES_COPY.tweakLabel(buddy.name),
            exact: true,
          }),
        )
        .toHaveAttribute("href", `/buddies/${buddy.id}`);
      await expect
        .element(
          own.getByRole("button", {
            name: BUDDIES_COPY.cloneLabel(buddy.name),
            exact: true,
          }),
        )
        .toBeEnabled();
    }),
  );
  await expect
    .element(own.getByText(BUDDIES_COPY.noOwn))
    .not.toBeInTheDocument();

  vi.mocked(listBuddies).mockResolvedValue([]);
  await screen.rerender(inWorkspace(await BuddiesPage()));
  await expect.element(own.getByText(BUDDIES_COPY.noOwn)).toBeVisible();
  expect(own.getByRole("listitem").elements()).toEqual([]);
  expect(builtIn.getByRole("listitem").elements()).toHaveLength(
    BUILT_INS.length,
  );
});
