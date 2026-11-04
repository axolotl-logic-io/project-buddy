// Her buddy's page in the browser: its reset button names the buddy whose
// prompt it restores, so a bought copy or a copy of her own copy doesn't
// hide that reset gives it the default buddy's prompt; and it asks before
// it replaces her saved prompt.
import { expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import BuddyPage from "@/app/(workspace)/buddies/[buddyId]/page.tsx";
import { resetBuddyPromptAction } from "@/app/(workspace)/buddies/actions.ts";
import { getOwnBuddy, type OwnBuddy } from "@/buddies/buddy-store.ts";
import { getBuddy } from "@/buddies/index.ts";
import { readSaleState } from "@/marketplace/listing-store.ts";
import { PROMPT_COPY } from "@/ui/copy/prompts.ts";
import {
  listingIdFixture,
  userBuddyIdFixture,
} from "../../../../support/id-fixtures.ts";
import {
  SIGNED_IN_USER,
  signInAs,
} from "../../../auth/current-user-test-kit.ts";
import { inWorkspace } from "../../workspace-test-kit.tsx";

vi.mock(
  "@/auth/current-user.ts",
  () => import("../../../auth/current-user-test-kit.ts"),
);
vi.mock("@/buddies/buddy-store.ts", () => ({
  getOwnBuddy: vi.fn<typeof getOwnBuddy>(),
}));
// Her buddy's page offers it for sale; selling is the Marketplace's, which
// marketplace-pages.browser.test.tsx covers.
vi.mock("@/marketplace/listing-store.ts", () => ({
  readSaleState: vi.fn<typeof readSaleState>(),
}));
vi.mock("@/app/(workspace)/marketplace/actions.ts", () => ({
  sellListingAction: vi.fn(),
}));
// The page exposes these actions; only reset is submitted.
vi.mock("@/app/(workspace)/buddies/actions.ts", () => ({
  editBuiltInBuddyAction: vi.fn(),
  resetBuddyPromptAction: vi.fn(),
  deleteBuddyAction: vi.fn(),
  saveBuddyAction: vi.fn(),
}));

// Her buddy with this source, as the store gives it.
function ownBuddy(
  source: Pick<OwnBuddy, "boughtFrom" | "clonedFrom">,
): OwnBuddy {
  return {
    id: userBuddyIdFixture("7a8b9c0d-1e2f-4a3b-8c4d-5e6f7a8b9c0d"),
    name: "Garden planner",
    definition: { prompt: "Help plan a garden." },
    createdAt: new Date("2026-10-12T09:00:00Z"),
    updatedAt: new Date("2026-10-12T09:00:00Z"),
    ...source,
  };
}

async function openPage(buddy: OwnBuddy): Promise<void> {
  signInAs(SIGNED_IN_USER);
  vi.mocked(getOwnBuddy).mockResolvedValue(buddy);
  vi.mocked(readSaleState).mockResolvedValue({ kind: "listable" });
  await render(
    inWorkspace(
      await BuddyPage({
        params: Promise.resolve({ buddyId: buddy.id }),
        searchParams: Promise.resolve({}),
      }),
    ),
  );
}

test("her copy of a built-in buddy resets to that buddy's prompt, by name", async () => {
  await openPage(ownBuddy({ clonedFrom: "mr-tee", boughtFrom: undefined }));

  await expect
    .element(
      page.getByRole("button", {
        name: PROMPT_COPY.resetLabel("prompt", getBuddy("mr-tee").name),
      }),
    )
    .toBeVisible();
});

const RESET_PROMPT = /Reset prompt/u;

test("a bought buddy explains why reset is unavailable", async () => {
  await openPage(
    ownBuddy({
      clonedFrom: undefined,
      boughtFrom: listingIdFixture("8b9c0d1e-2f3a-4b4c-9d5e-6f7a8b9c0d1e"),
    }),
  );

  await expect
    .element(page.getByText(PROMPT_COPY.boughtResetHint))
    .toBeVisible();
  await expect
    .element(page.getByRole("button", { name: RESET_PROMPT }))
    .not.toBeInTheDocument();
});

test("reset asks first: keeping her prompt resets nothing, and confirming resets it", async () => {
  const submitted = Promise.withResolvers<void>();
  vi.mocked(resetBuddyPromptAction).mockImplementation(() => {
    submitted.resolve();
    return new Promise<never>(() => undefined);
  });
  const source = getBuddy("mr-tee").name;
  await openPage(ownBuddy({ clonedFrom: "mr-tee", boughtFrom: undefined }));
  const reset = page.getByRole("button", {
    name: PROMPT_COPY.resetLabel("prompt", source),
  });

  await reset.click();
  const dialog = page.getByRole("alertdialog", {
    name: PROMPT_COPY.resetTitle("prompt", source),
  });
  await expect
    .element(dialog)
    .toHaveAccessibleDescription(
      PROMPT_COPY.resetDescription("prompt", source),
    );
  await dialog
    .getByRole("button", { name: PROMPT_COPY.resetCancel("prompt") })
    .click();
  await expect.element(dialog).not.toBeInTheDocument();
  expect(resetBuddyPromptAction).not.toHaveBeenCalled();

  await reset.click();
  await dialog
    .getByRole("button", { name: PROMPT_COPY.resetConfirm("prompt") })
    .click();
  await submitted.promise;
  expect(resetBuddyPromptAction).toHaveBeenCalledTimes(1);
});

test("completed reset announces its result and keeps keyboard focus after pending work", async () => {
  const pending = Promise.withResolvers<void>();
  vi.mocked(resetBuddyPromptAction).mockReturnValue(pending.promise);
  await openPage(ownBuddy({ clonedFrom: "mr-tee", boughtFrom: undefined }));
  await page
    .getByRole("button", {
      name: PROMPT_COPY.resetLabel("prompt", getBuddy("mr-tee").name),
    })
    .click();
  await page
    .getByRole("button", {
      name: PROMPT_COPY.resetConfirm("prompt"),
      exact: true,
    })
    .click();
  await expect
    .element(
      page.getByText(
        PROMPT_COPY.resetComplete("prompt", getBuddy("mr-tee").name),
        { exact: true },
      ),
    )
    .not.toBeInTheDocument();
  pending.resolve();
  await expect
    .element(
      page.getByText(
        PROMPT_COPY.resetComplete("prompt", getBuddy("mr-tee").name),
        { exact: true },
      ),
    )
    .toHaveTextContent(
      PROMPT_COPY.resetComplete("prompt", getBuddy("mr-tee").name),
    );
  await expect
    .element(
      page.getByText(
        PROMPT_COPY.resetComplete("prompt", getBuddy("mr-tee").name),
        { exact: true },
      ),
    )
    .toHaveFocus();
});
