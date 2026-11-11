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

vi.mock(
  "next/navigation",
  () => import("../../../components/router-test-kit.ts"),
);

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
  retireConstructAction: vi.fn(),
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
      page.getByRole("heading", {
        level: 1,
        name: "Garden planner",
        exact: true,
      }),
    )
    .toBeVisible();

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

vi.mock("@/retirement/retirement-store.ts", () => ({
  getRetiredDefinition: vi.fn(),
  listRetiredDefinitions: vi.fn(),
}));

const VISUAL_ROLE_COUNT = 4;

test("built-in visuals stay read-only beside Customize and all four role previews", async () => {
  signInAs(SIGNED_IN_USER);
  await render(
    inWorkspace(
      await ConstructPage({
        params: Promise.resolve({ constructId: "lumen" }),
        searchParams: Promise.resolve({}),
      }),
    ),
  );
  await expect
    .element(page.getByRole("button", { name: "Customize", exact: true }))
    .toBeVisible();
  await expect
    .element(page.getByRole("textbox", { name: "Visual description" }))
    .not.toBeInTheDocument();
  await expect
    .element(page.getByRole("button", { name: "Generate Images" }))
    .not.toBeInTheDocument();
  for (const role of ["Avatar", "Portrait", "Opening", "Working"]) {
    expect(page.getByText(role, { exact: true }).elements()).toHaveLength(1);
  }
  expect(page.getByRole("img", { name: "Lumen" }).elements()).toHaveLength(
    VISUAL_ROLE_COUNT,
  );
  await expect
    .element(
      page.getByRole("region", { name: PROMPT_COPY.constructFieldsHeading }),
    )
    .toBeVisible();
  await expect
    .element(
      page.getByRole("heading", {
        level: 2,
        name: PROMPT_COPY.constructFieldsHeading,
        exact: true,
      }),
    )
    .toBeVisible();
});
