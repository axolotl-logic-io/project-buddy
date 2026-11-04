// Her buddy's page in the browser: its reset button names the buddy whose
// prompt it restores, so a bought copy or a copy of her own copy doesn't
// hide that reset gives it the default buddy's prompt.
import { expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import BuddyPage from "@/app/(workspace)/buddies/[buddyId]/page.tsx";
import { getOwnBuddy, type OwnBuddy } from "@/buddies/buddy-store.ts";
import { DEFAULT_BUDDY_ID, getBuddy } from "@/buddies/index.ts";
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
// The page exposes these actions; none is submitted here.
vi.mock("@/app/(workspace)/buddies/actions.ts", () => ({
  editBuiltInBuddyAction: vi.fn(),
  resetBuddyPromptAction: vi.fn(),
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

test("a bought buddy names the default buddy as what reset gives it", async () => {
  await openPage(
    ownBuddy({
      clonedFrom: undefined,
      boughtFrom: listingIdFixture("8b9c0d1e-2f3a-4b4c-9d5e-6f7a8b9c0d1e"),
    }),
  );

  await expect
    .element(
      page.getByRole("button", {
        name: PROMPT_COPY.resetLabel("prompt", getBuddy(DEFAULT_BUDDY_ID).name),
      }),
    )
    .toBeVisible();
});
