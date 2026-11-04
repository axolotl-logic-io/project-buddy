import { expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import BuddiesPage from "@/app/(workspace)/buddies/(list)/page.tsx";
import {
  deleteBuddyAction,
  newBuddyAction,
} from "@/app/(workspace)/buddies/actions.ts";
import { listBuddies, type OwnBuddy } from "@/buddies/buddy-store.ts";
import { listListedSources } from "@/marketplace/listing-store.ts";
import { BUDDIES_COPY } from "@/ui/copy/buddies.ts";
import { DELETE_PROMPT_COPY } from "@/ui/copy/prompts.ts";
import {
  listingIdFixture,
  userBuddyIdFixture,
} from "../../support/id-fixtures.ts";
import { HIPPY_CLONE } from "../app/phone-pages-fixtures.ts";
import { inWorkspace } from "../app/workspace-test-kit.tsx";
import { SIGNED_IN_USER, signInAs } from "../auth/current-user-test-kit.ts";
import { tabForward } from "../components/keyboard-test-kit.ts";

vi.mock(
  "@/auth/current-user.ts",
  () => import("../auth/current-user-test-kit.ts"),
);
vi.mock("@/buddies/buddy-store.ts", () => ({
  listBuddies: vi.fn<typeof listBuddies>(),
}));
vi.mock("@/marketplace/listing-store.ts", () => ({
  listListedSources: vi.fn<typeof listListedSources>(),
}));
// Listing exposes these actions; only New buddy, from the keyboard, and
// Delete are submitted.
vi.mock("@/app/(workspace)/buddies/actions.ts", () => ({
  cloneBuddyAction: vi.fn(),
  deleteBuddyAction: vi.fn(),
  editBuiltInBuddyAction: vi.fn(),
  newBuddyAction: vi.fn(),
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
  vi.mocked(listListedSources).mockResolvedValue(new Map());
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
  await expect
    .element(own.getByRole("button", { name: BUDDIES_COPY.newBuddy }))
    .toBeEnabled();

  vi.mocked(listBuddies).mockResolvedValue([]);
  await screen.rerender(inWorkspace(await BuddiesPage()));
  await expect.element(own.getByText(BUDDIES_COPY.noOwn)).toBeVisible();
  await expect
    .element(own.getByRole("button", { name: BUDDIES_COPY.newBuddy }))
    .toBeEnabled();
  expect(own.getByRole("listitem").elements()).toEqual([]);
  expect(builtIn.getByRole("listitem").elements()).toHaveLength(
    BUILT_INS.length,
  );
});

test("New buddy is the next control after the built-in buddies, and Enter writes one", async () => {
  signInAs(SIGNED_IN_USER);
  vi.mocked(listListedSources).mockResolvedValue(new Map());
  vi.mocked(listBuddies).mockResolvedValue([]);
  const submitted = Promise.withResolvers<void>();
  // The action redirects; here it only says it was submitted.
  vi.mocked(newBuddyAction).mockImplementation(() => {
    submitted.resolve();
    return new Promise<never>(() => undefined);
  });
  await render(inWorkspace(await BuddiesPage()));
  const lastBuiltIn = BUILT_INS.at(-1)?.name ?? "";

  page
    .getByRole("button", { name: BUDDIES_COPY.customizeLabel(lastBuiltIn) })
    .element()
    .focus();
  await tabForward();
  await expect
    .element(page.getByRole("button", { name: BUDDIES_COPY.newBuddy }))
    .toHaveFocus();
  await userEvent.keyboard("{Enter}");

  await submitted.promise;
  expect(newBuddyAction).toHaveBeenCalledOnce();
});

test("Delete asks first, and says what a bought or listed buddy keeps", async () => {
  signInAs(SIGNED_IN_USER);
  const bought: OwnBuddy = {
    ...HIPPY_CLONE,
    id: userBuddyIdFixture("6d3e4f5a-6b7c-4d8e-9f0a-1b2c3d4e5f6a"),
    name: "Market guide",
    boughtFrom: listingIdFixture("5d3e4f5a-6b7c-4d8e-9f0a-1b2c3d4e5f6a"),
  };
  const listed: OwnBuddy = {
    ...HIPPY_CLONE,
    id: userBuddyIdFixture("7d3e4f5a-6b7c-4d8e-9f0a-1b2c3d4e5f6a"),
    name: "Listed guide",
  };
  const listing = listingIdFixture("8d3e4f5a-6b7c-4d8e-9f0a-1b2c3d4e5f6a");
  vi.mocked(listBuddies).mockResolvedValue([HIPPY_CLONE, listed, bought]);
  vi.mocked(listListedSources).mockResolvedValue(
    new Map([[listed.id, listing]]),
  );
  const submitted = Promise.withResolvers<void>();
  // The action redirects; here it only says it was submitted.
  vi.mocked(deleteBuddyAction).mockImplementation(() => {
    submitted.resolve();
    return new Promise<never>(() => undefined);
  });
  await render(inWorkspace(await BuddiesPage()));
  const dialog = page.getByRole("alertdialog", {
    name: DELETE_PROMPT_COPY.title("buddy"),
  });

  await page
    .getByRole("button", {
      name: DELETE_PROMPT_COPY.deleteLabel(HIPPY_CLONE.name),
    })
    .click();
  await expect
    .element(dialog)
    .toHaveAccessibleDescription(
      DELETE_PROMPT_COPY.description("buddy", HIPPY_CLONE.name, "none"),
    );
  await expect
    .element(dialog.getByRole("link", { name: DELETE_PROMPT_COPY.unlistLink }))
    .not.toBeInTheDocument();
  await expect
    .element(dialog.getByRole("button", { name: DELETE_PROMPT_COPY.cancel }))
    .toHaveFocus();
  await userEvent.keyboard("{Enter}");
  await expect.element(dialog).not.toBeInTheDocument();

  await page
    .getByRole("button", { name: DELETE_PROMPT_COPY.deleteLabel(listed.name) })
    .click();
  await expect
    .element(dialog)
    .toHaveAccessibleDescription(
      DELETE_PROMPT_COPY.description("buddy", listed.name, "listed"),
    );
  await expect
    .element(dialog.getByRole("link", { name: DELETE_PROMPT_COPY.unlistLink }))
    .toHaveAttribute("href", `/marketplace/${listing}`);
  await userEvent.keyboard("{Escape}");
  await expect.element(dialog).not.toBeInTheDocument();
  expect(deleteBuddyAction).not.toHaveBeenCalled();

  await page
    .getByRole("button", { name: DELETE_PROMPT_COPY.deleteLabel(bought.name) })
    .click();
  await expect
    .element(dialog)
    .toHaveAccessibleDescription(
      DELETE_PROMPT_COPY.description("buddy", bought.name, "bought"),
    );
  await dialog
    .getByRole("button", { name: DELETE_PROMPT_COPY.confirm("buddy") })
    .click();

  await submitted.promise;
  expect(deleteBuddyAction).toHaveBeenCalledOnce();
  const sent = vi.mocked(deleteBuddyAction).mock.calls[0]?.[0];
  expect(sent?.get("promptId")).toBe(bought.id);
});
