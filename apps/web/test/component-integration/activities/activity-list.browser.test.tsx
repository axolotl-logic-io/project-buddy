// The activities page's New activity button, with her own activities and
// with none: it sits among her own, follows the built-in activities in
// keyboard order, and Enter writes a new activity.
import { expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { listOwnActivities } from "@/activities/activity-store.ts";
import { listActivities } from "@/activities/index.ts";
import ActivitiesPage from "@/app/(workspace)/activities/(list)/page.tsx";
import { newActivityAction } from "@/app/(workspace)/activities/actions.ts";
import { ACTIVITIES_COPY } from "@/ui/copy/activities.ts";
import { BRAINSTORMING_CLONE } from "../app/phone-pages-fixtures.ts";
import { inWorkspace } from "../app/workspace-test-kit.tsx";
import { SIGNED_IN_USER, signInAs } from "../auth/current-user-test-kit.ts";
import { tabForward } from "../components/keyboard-test-kit.ts";

vi.mock(
  "@/auth/current-user.ts",
  () => import("../auth/current-user-test-kit.ts"),
);
vi.mock("@/activities/activity-store.ts", () => ({
  listOwnActivities: vi.fn<typeof listOwnActivities>(),
}));
// Listing exposes these actions; only New activity is submitted, from the
// keyboard.
vi.mock("@/app/(workspace)/activities/actions.ts", () => ({
  cloneActivityAction: vi.fn(),
  deleteActivityAction: vi.fn(),
  editBuiltInActivityAction: vi.fn(),
  newActivityAction: vi.fn(),
}));

// Her activities, under their heading.
function ownRegion(): ReturnType<typeof page.getByRole> {
  return page.getByRole("region", { name: ACTIVITIES_COPY.ownHeading });
}

test("her activities offer New activity, with or without activities of her own", async () => {
  signInAs(SIGNED_IN_USER);
  vi.mocked(listOwnActivities).mockResolvedValue([BRAINSTORMING_CLONE]);
  const screen = await render(inWorkspace(await ActivitiesPage()));

  await expect
    .element(
      ownRegion().getByRole("button", { name: ACTIVITIES_COPY.newActivity }),
    )
    .toBeEnabled();

  vi.mocked(listOwnActivities).mockResolvedValue([]);
  await screen.rerender(inWorkspace(await ActivitiesPage()));
  await expect
    .element(ownRegion().getByText(ACTIVITIES_COPY.noOwn))
    .toBeVisible();
  await expect
    .element(
      ownRegion().getByRole("button", { name: ACTIVITIES_COPY.newActivity }),
    )
    .toBeEnabled();
});

test("New activity is the next control after the built-in activities, and Enter writes one", async () => {
  signInAs(SIGNED_IN_USER);
  vi.mocked(listOwnActivities).mockResolvedValue([]);
  const submitted = Promise.withResolvers<void>();
  // The action redirects; here it only says it was submitted.
  vi.mocked(newActivityAction).mockImplementation(() => {
    submitted.resolve();
    return new Promise<never>(() => undefined);
  });
  await render(inWorkspace(await ActivitiesPage()));
  const lastBuiltIn = listActivities().at(-1)?.name ?? "";

  page
    .getByRole("button", { name: ACTIVITIES_COPY.customizeLabel(lastBuiltIn) })
    .element()
    .focus();
  await tabForward();
  await expect
    .element(page.getByRole("button", { name: ACTIVITIES_COPY.newActivity }))
    .toHaveFocus();
  await userEvent.keyboard("{Enter}");

  await submitted.promise;
  expect(newActivityAction).toHaveBeenCalledOnce();
});
