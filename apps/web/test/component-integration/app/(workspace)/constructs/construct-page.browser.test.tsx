// Her construct's page in the browser: its reset button names the construct whose
// prompt it restores, so a copy of her own copy doesn't hide that reset gives
// it the default construct's prompt; and it asks before it replaces her saved
// prompt.
import { expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import ConstructPage from "@/app/(workspace)/constructs/[constructId]/page.tsx";
import {
  getOwnConstruct,
  type OwnConstruct,
} from "@/constructs/construct-store.ts";
import { PROMPT_COPY } from "@/ui/copy/prompts.ts";
import { userConstructIdFixture } from "../../../../support/id-fixtures.ts";
import {
  SIGNED_IN_USER,
  signInAs,
} from "../../../auth/current-user-test-kit.ts";
import { inWorkspace } from "../../workspace-test-kit.tsx";

vi.mock(
  "next/navigation",
  () => import("../../../components/router-test-kit.ts"),
);

vi.mock("@/workshop/options.ts", () => ({
  workshopOptions: async () => ({
    constructs: [{ id: "vellum", name: "Vellum" }],
    activities: [{ id: "open-chat", name: "Chat" }],
  }),
}));

vi.mock(
  "@/auth/current-user.ts",
  () => import("../../../auth/current-user-test-kit.ts"),
);
vi.mock("@/constructs/construct-store.ts", () => ({
  getOwnConstruct: vi.fn<typeof getOwnConstruct>(),
}));
// The page exposes these actions; only reset is submitted.
vi.mock("@/app/(workspace)/constructs/actions.ts", () => ({
  editBuiltInConstructAction: vi.fn(),
  resetConstructPromptAction: vi.fn(),
  retireConstructAction: vi.fn(),
  saveConstructAction: vi.fn(),
}));

// Her construct with this source, as the store gives it.
function ownConstruct(source: Pick<OwnConstruct, "clonedFrom">): OwnConstruct {
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
  await openPage(ownConstruct({ clonedFrom: "lumen" }));
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

// A construct that came from no built-in one, such as a copy bought in the
// Marketplace before it closed, resets to the default construct's prompt.
test("a construct from no built-in one offers reset to the default prompt", async () => {
  await openPage(ownConstruct({ clonedFrom: undefined }));

  await expect
    .element(page.getByRole("button", { name: PROMPT_COPY.resetPrompt }))
    .toBeVisible();
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
