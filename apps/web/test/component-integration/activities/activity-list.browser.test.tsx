// The activities page's Create activity button, with her own activities and
// with none: it sits among her own, follows the built-in activities in
// keyboard order, and Enter crafts a new activity.
import { beforeEach, describe, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import type { OwnActivity } from "@/activities/activity-store.ts";
import { listOwnActivities } from "@/activities/activity-store.ts";
import ActivitiesPage from "@/app/(workspace)/activities/(list)/page.tsx";
import { newActivityAction } from "@/app/(workspace)/activities/actions.ts";
import { startQuestAction } from "@/app/(workspace)/projects/actions.ts";
import { questCreationChoices } from "@/projects/quest-creation-choices.ts";
import { ACTIVITIES_COPY } from "@/ui/copy/activities.ts";
import { QUEST_START_COPY } from "@/ui/copy/projects.ts";
import { START_WORK_COPY } from "@/ui/copy/start-work.ts";
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

vi.mock("@/projects/quest-creation-choices.ts", () => ({
  questCreationChoices: vi.fn<typeof questCreationChoices>(),
}));
vi.mock("@/app/(workspace)/projects/actions.ts", () => ({
  startQuestAction: vi.fn<typeof startQuestAction>(),
}));

// Listing exposes these actions; only Create activity is submitted, from the
// keyboard.
vi.mock("@/app/(workspace)/activities/actions.ts", () => ({
  cloneActivityAction: vi.fn(),
  editBuiltInActivityAction: vi.fn(),
  newActivityAction: vi.fn(),
  retireActivityAction: vi.fn(),
}));

// Her activities, under their heading.
function ownRegion(): ReturnType<typeof page.getByRole> {
  return page.getByRole("tabpanel", { name: "Yours", exact: true });
}

beforeEach(() => {
  vi.mocked(questCreationChoices).mockResolvedValue({
    activities: [],
    userConstructs: [],
    preferredConstructId: "vellum",
  });
});

test("her activities offer Create activity, with or without activities of her own", async () => {
  signInAs(SIGNED_IN_USER);
  vi.mocked(listOwnActivities).mockResolvedValue([SAVED_ACTIVITY]);
  const screen = await render(
    inWorkspace(
      await ActivitiesPage({
        params: Promise.resolve({}),
        searchParams: Promise.resolve({}),
      }),
    ),
  );

  await expect
    .element(page.getByRole("button", { name: "Create activity" }))
    .toBeEnabled();

  await page.getByRole("tab", { name: "Yours", exact: true }).click();
  vi.mocked(listOwnActivities).mockResolvedValue([]);
  await screen.rerender(
    inWorkspace(
      await ActivitiesPage({
        params: Promise.resolve({}),
        searchParams: Promise.resolve({}),
      }),
    ),
  );
  await expect
    .element(ownRegion().getByText(ACTIVITIES_COPY.noOwn))
    .toBeVisible();
  await expect
    .element(page.getByRole("button", { name: "Create activity" }))
    .toBeEnabled();
});

test("the header Create activity action supports keyboard submission", async () => {
  signInAs(SIGNED_IN_USER);
  vi.mocked(listOwnActivities).mockResolvedValue([]);
  const submitted = Promise.withResolvers<void>();
  // The action redirects; here it only says it was submitted.
  vi.mocked(newActivityAction).mockImplementation(() => {
    submitted.resolve();
    return new Promise<never>(() => undefined);
  });
  await render(
    inWorkspace(
      await ActivitiesPage({
        params: Promise.resolve({}),
        searchParams: Promise.resolve({}),
      }),
    ),
  );
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

describe("use_case_start_chat_in_activity", () => {
  test.each([
    { id: "open-chat", name: "Chat", start: "do", startName: "Do a thing" },
    {
      id: "find-something-to-make",
      name: "Find something to make",
      start: "make",
      startName: "Make a thing",
    },
    {
      id: "brainstorming",
      name: "Brainstorm",
      start: "do",
      startName: "Do a thing",
    },
    {
      id: BRAINSTORMING_CLONE.id,
      name: SAVED_ACTIVITY.name,
      start: "do",
      startName: "Do a thing",
    },
    {
      id: "project-breakdown",
      name: "Break Down a Project",
      start: "do",
      startName: "Do a thing",
    },
  ])(
    "the $name title opens $startName with it chosen, and closing makes nothing",
    async (activity) => {
      signInAs(SIGNED_IN_USER);
      vi.mocked(startQuestAction).mockClear();
      vi.mocked(listOwnActivities).mockResolvedValue([SAVED_ACTIVITY]);
      const submitted = Promise.withResolvers<FormData>();
      vi.mocked(startQuestAction).mockImplementation((_state, form) => {
        submitted.resolve(form);
        return new Promise<never>(() => undefined);
      });
      await render(
        inWorkspace(
          await ActivitiesPage({
            params: Promise.resolve({}),
            searchParams: Promise.resolve({}),
          }),
        ),
      );
      if (activity.id === SAVED_ACTIVITY.id) {
        await page.getByRole("tab", { name: "Yours", exact: true }).click();
      }
      const trigger = page.getByRole("button", {
        name: activity.name,
        exact: true,
      });
      await trigger.click();
      const dialog = page.getByRole("dialog", {
        name: START_WORK_COPY.activityDialogHeading(activity.name),
      });
      await expect
        .element(dialog.getByRole("heading", { name: activity.startName }))
        .toBeVisible();
      await page
        .getByRole("button", { name: START_WORK_COPY.closeDialog })
        .click();
      await expect.element(dialog).not.toBeInTheDocument();
      await expect.element(trigger).toHaveFocus();
      expect(startQuestAction).not.toHaveBeenCalled();

      await userEvent.keyboard("{Enter}");
      await dialog
        .getByRole("button", { name: QUEST_START_COPY.start, exact: true })
        .click();
      const sent = await submitted.promise;
      expect(sent.get("activityId")).toBe(activity.id);
      expect(sent.get("premadeId")).toBe(activity.start);
    },
  );
});

vi.mock("@/constructs/interview-construct.ts", () => ({
  interviewConstruct: vi.fn().mockResolvedValue({ id: "vellum" }),
}));
