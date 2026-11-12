// The Workshop's Activities list: each activity's name opens its page, with
// no start action, and Create activity sits among the user's own, with or
// without any, and creates a new activity from the keyboard.

import type { JSX } from "react";
import { expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import type { OwnActivity } from "@/activities/activity-store.ts";
import { listOwnActivities } from "@/activities/activity-store.ts";
import { listActivities } from "@/activities/index.ts";
import { newActivityAction } from "@/app/(workspace)/activities/actions.ts";
import { ActivityLists } from "@/app/(workspace)/activities/activity-lists.tsx";
import { ACTIVITIES_COPY } from "@/ui/copy/activities.ts";
import { BRAINSTORMING_CLONE } from "../app/phone-pages-fixtures.ts";
import { inWorkspace } from "../app/workspace-test-kit.tsx";
import { SIGNED_IN_USER, signInAs } from "../auth/current-user-test-kit.ts";

vi.mock(
  "@/auth/current-user.ts",
  () => import("../auth/current-user-test-kit.ts"),
);
vi.mock("@/activities/activity-store.ts", () => ({
  listOwnActivities: vi.fn<typeof listOwnActivities>(),
}));
const SAVED_ACTIVITY: OwnActivity = {
  ...BRAINSTORMING_CLONE,
  name: "Brainstorming (clone)",
};

// Listing exposes these actions; only Create activity is submitted, from the
// keyboard.
vi.mock("@/app/(workspace)/activities/actions.ts", () => ({
  cloneActivityAction: vi.fn(),
  editBuiltInActivityAction: vi.fn(),
  newActivityAction: vi.fn(),
  retireActivityAction: vi.fn(),
}));

// The list the Workshop's Activities tab shows.
async function activitiesTab(): Promise<JSX.Element> {
  return inWorkspace(await ActivityLists());
}

test("each activity's name opens its page, and none offers a start", async () => {
  signInAs(SIGNED_IN_USER);
  vi.mocked(listOwnActivities).mockResolvedValue([SAVED_ACTIVITY]);
  await render(await activitiesTab());

  await Promise.all(
    [...listActivities(), SAVED_ACTIVITY].map(({ id, name }) =>
      expect
        .element(page.getByRole("link", { name, exact: true }))
        .toHaveAttribute("href", `/activities/${id}`),
    ),
  );
  await expect
    .element(page.getByRole("button", { name: "Brainstorm", exact: true }))
    .not.toBeInTheDocument();
  await expect.element(page.getByRole("dialog")).not.toBeInTheDocument();
});

test("her activities offer Create activity, with or without activities of her own", async () => {
  signInAs(SIGNED_IN_USER);
  vi.mocked(listOwnActivities).mockResolvedValue([SAVED_ACTIVITY]);
  const screen = await render(await activitiesTab());

  await expect
    .element(page.getByRole("button", { name: "Create activity" }))
    .toBeEnabled();

  vi.mocked(listOwnActivities).mockResolvedValue([]);
  await screen.rerender(await activitiesTab());
  await expect.element(page.getByText(ACTIVITIES_COPY.noOwn)).toBeVisible();
  await expect
    .element(page.getByRole("button", { name: "Create activity" }))
    .toBeEnabled();
});

test("Create activity supports keyboard submission", async () => {
  signInAs(SIGNED_IN_USER);
  vi.mocked(listOwnActivities).mockResolvedValue([]);
  const submitted = Promise.withResolvers<void>();
  // The action redirects; here it only says it was submitted.
  vi.mocked(newActivityAction).mockImplementation(() => {
    submitted.resolve();
    return new Promise<never>(() => undefined);
  });
  await render(await activitiesTab());
  page
    .getByRole("button", { name: "Create activity", exact: true })
    .element()
    .focus();
  await expect
    .element(page.getByRole("button", { name: "Create activity" }))
    .toHaveFocus();
  await userEvent.keyboard("{Enter}");

  await submitted.promise;
  expect(newActivityAction).toHaveBeenCalledOnce();
});
