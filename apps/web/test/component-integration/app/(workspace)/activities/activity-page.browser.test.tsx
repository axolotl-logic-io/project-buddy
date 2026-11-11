// Her activity's page in the browser: its reset button names the activity
// whose prompt it restores, the built-in one hers was customized from or
// else the open chat.
import { expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { DEFAULT_ACTIVITY_ID } from "@/activities/activity.ts";
import { getOwnActivity } from "@/activities/activity-store.ts";
import { getActivity } from "@/activities/index.ts";
import ActivityPage from "@/app/(workspace)/activities/[activityId]/page.tsx";
import { readSaleState } from "@/marketplace/listing-store.ts";
import { PROMPT_COPY } from "@/ui/copy/prompts.ts";
import {
  SIGNED_IN_USER,
  signInAs,
} from "../../../auth/current-user-test-kit.ts";
import { BRAINSTORMING_CLONE } from "../../phone-pages-fixtures.ts";
import { inWorkspace } from "../../workspace-test-kit.tsx";

vi.mock(
  "next/navigation",
  () => import("../../../components/router-test-kit.ts"),
);

vi.mock(
  "@/auth/current-user.ts",
  () => import("../../../auth/current-user-test-kit.ts"),
);
vi.mock("@/activities/activity-store.ts", () => ({
  getOwnActivity: vi.fn<typeof getOwnActivity>(),
}));
// Her activity's page offers it for sale; selling is the Marketplace's,
// which marketplace-pages.browser.test.tsx covers.
vi.mock("@/marketplace/listing-store.ts", () => ({
  readSaleState: vi.fn<typeof readSaleState>(),
}));
vi.mock("@/app/(workspace)/marketplace/actions.ts", () => ({
  sellListingAction: vi.fn(),
}));
// The page exposes these actions; none is submitted here.
vi.mock("@/app/(workspace)/activities/actions.ts", () => ({
  editBuiltInActivityAction: vi.fn(),
  resetActivityPromptAction: vi.fn(),
  retireActivityAction: vi.fn(),
  saveActivityAction: vi.fn(),
}));

test.each([
  {
    made: "customized from a built-in activity",
    activity: BRAINSTORMING_CLONE,
    source: getActivity("brainstorming").name,
  },
  {
    made: "crafted",
    activity: { ...BRAINSTORMING_CLONE, clonedFrom: undefined },
    source: getActivity(DEFAULT_ACTIVITY_ID).name,
  },
])("her activity $made names what its reset restores", async ({ activity }) => {
  signInAs(SIGNED_IN_USER);
  vi.mocked(getOwnActivity).mockResolvedValue(activity);
  vi.mocked(readSaleState).mockResolvedValue({ kind: "listable" });
  await render(
    inWorkspace(
      await ActivityPage({
        params: Promise.resolve({ activityId: activity.id }),
        searchParams: Promise.resolve({}),
      }),
    ),
  );

  await expect
    .element(
      page.getByRole("heading", { level: 1, name: activity.name, exact: true }),
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

vi.mock("@/retirement/retirement-store.ts", () => ({
  getRetiredDefinition: vi.fn(),
  listRetiredDefinitions: vi.fn(),
}));

vi.mock("@/app/(workspace)/projects/actions.ts", () => ({
  startQuestAction: vi.fn(),
}));
vi.mock("@/projects/quest-creation-choices.ts", () => ({
  questCreationChoices: vi.fn().mockResolvedValue({
    activities: [],
    userConstructs: [],
    preferredConstructId: "vellum",
  }),
}));
