// Her construct's page in the browser: its reset button names the construct whose
// prompt it restores, so a bought copy or a copy of her own copy doesn't
// hide that reset gives it the default construct's prompt; and it asks before
// it replaces her saved prompt.
import { expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import ConstructPage from "@/app/(workspace)/constructs/[constructId]/page.tsx";
import {
  getOwnConstruct,
  type OwnConstruct,
} from "@/constructs/construct-store.ts";
import { readSaleState } from "@/marketplace/listing-store.ts";
import { PROMPT_COPY } from "@/ui/copy/prompts.ts";
import {
  listingIdFixture,
  userConstructIdFixture,
} from "../../../../support/id-fixtures.ts";
import {
  SIGNED_IN_USER,
  signInAs,
} from "../../../auth/current-user-test-kit.ts";
import { inWorkspace } from "../../workspace-test-kit.tsx";

vi.mock("@/workshop/options.ts", () => ({
  workshopOptions: async () => ({
    constructs: [{ id: "vellum", name: "Vellum" }],
    activities: [{ id: "open-chat", name: "Open chat" }],
  }),
}));

vi.mock(
  "@/auth/current-user.ts",
  () => import("../../../auth/current-user-test-kit.ts"),
);
vi.mock("@/constructs/construct-store.ts", () => ({
  getOwnConstruct: vi.fn<typeof getOwnConstruct>(),
}));
// Her construct's page offers it for sale; selling is the Marketplace's, which
// marketplace-pages.browser.test.tsx covers.
vi.mock("@/marketplace/listing-store.ts", () => ({
  readSaleState: vi.fn<typeof readSaleState>(),
}));
vi.mock("@/app/(workspace)/marketplace/actions.ts", () => ({
  sellListingAction: vi.fn(),
}));
// The page exposes these actions; only reset is submitted.
vi.mock("@/app/(workspace)/constructs/actions.ts", () => ({
  editBuiltInConstructAction: vi.fn(),
  resetConstructPromptAction: vi.fn(),
  deleteConstructAction: vi.fn(),
  saveConstructAction: vi.fn(),
}));

// Her construct with this source, as the store gives it.
function ownConstruct(
  source: Pick<OwnConstruct, "boughtFrom" | "clonedFrom">,
): OwnConstruct {
  return {
    id: userConstructIdFixture("7a8b9c0d-1e2f-4a3b-8c4d-5e6f7a8b9c0d"),
    name: "Garden planner",
    definition: { prompt: "Help plan a garden." },
    createdAt: new Date("2026-10-12T09:00:00Z"),
    updatedAt: new Date("2026-10-12T09:00:00Z"),
    ...source,
  };
}

async function openPage(construct: OwnConstruct): Promise<void> {
  signInAs(SIGNED_IN_USER);
  vi.mocked(getOwnConstruct).mockResolvedValue(construct);
  vi.mocked(readSaleState).mockResolvedValue({ kind: "listable" });
  await render(
    inWorkspace(
      await ConstructPage({
        params: Promise.resolve({ constructId: construct.id }),
        searchParams: Promise.resolve({}),
      }),
    ),
  );
}

test("her copy of a built-in construct resets to that construct's prompt, by name", async () => {
  await openPage(ownConstruct({ clonedFrom: "lumen", boughtFrom: undefined }));

  await expect
    .element(
      page.getByRole("button", {
        name: PROMPT_COPY.resetPrompt,
      }),
    )
    .toBeVisible();
});

const RESET_PROMPT = /Reset prompt/u;

test("a bought construct explains why reset is unavailable", async () => {
  await openPage(
    ownConstruct({
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
