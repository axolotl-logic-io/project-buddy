// The activities page's Craft activity button, with her own activities and
// with none: it sits among her own, follows the built-in activities in
// keyboard order, and Enter crafts a new activity.
import { beforeEach, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { listOwnActivities } from "@/activities/activity-store.ts";
import { listActivities } from "@/activities/index.ts";
import ActivitiesPage from "@/app/(workspace)/activities/(list)/page.tsx";
import { newActivityAction } from "@/app/(workspace)/activities/actions.ts";
import { startChatAction } from "@/app/(workspace)/chats/actions.ts";
import { newChatChoices } from "@/chats/new-chat-choices.ts";
import { ACTIVITIES_COPY } from "@/ui/copy/activities.ts";
import { NEW_CHAT_COPY } from "@/ui/copy/chat.ts";
import { projectIdFixture } from "../../support/id-fixtures.ts";
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
const PROJECT = {
  id: projectIdFixture(),
  name: "Low-poly fox",
  status: "active" as const,
};

vi.mock("@/chats/new-chat-choices.ts", () => ({
  newChatChoices: vi.fn<typeof newChatChoices>(),
}));
vi.mock("@/app/(workspace)/chats/actions.ts", () => ({
  startChatAction: vi.fn<typeof startChatAction>(),
}));

// Listing exposes these actions; only Craft activity is submitted, from the
// keyboard.
vi.mock("@/app/(workspace)/activities/actions.ts", () => ({
  cloneActivityAction: vi.fn(),
  editBuiltInActivityAction: vi.fn(),
  newActivityAction: vi.fn(),
  retireActivityAction: vi.fn(),
}));

// Her activities, under their heading.
function ownRegion(): ReturnType<typeof page.getByRole> {
  return page.getByRole("region", { name: ACTIVITIES_COPY.ownHeading });
}

beforeEach(() => {
  vi.mocked(newChatChoices).mockResolvedValue({
    projects: [PROJECT],
    activities: [],
    userConstructs: [],
  });
});

test("her activities offer Craft activity, with or without activities of her own", async () => {
  signInAs(SIGNED_IN_USER);
  vi.mocked(startChatAction).mockClear();
  vi.mocked(listOwnActivities).mockResolvedValue([BRAINSTORMING_CLONE]);
  const screen = await render(
    inWorkspace(
      await ActivitiesPage({
        params: Promise.resolve({}),
        searchParams: Promise.resolve({}),
      }),
    ),
  );

  await expect
    .element(ownRegion().getByRole("button", { name: "Craft activity" }))
    .toBeEnabled();

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
    .element(ownRegion().getByRole("button", { name: "Craft activity" }))
    .toBeEnabled();
});

test("Craft activity is the next control after the built-in activities, and Enter crafts one", async () => {
  signInAs(SIGNED_IN_USER);
  vi.mocked(startChatAction).mockClear();
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
  const lastBuiltIn = listActivities().at(-1);
  let lastControl = page.getByRole("button", {
    name: ACTIVITIES_COPY.customizeLabel(lastBuiltIn?.name ?? ""),
  });
  if (lastBuiltIn?.id === "find-something-to-make") {
    lastControl = page.getByRole("button", {
      name: "Explore quest: Start without inspiration",
    });
  }

  lastControl.element().focus();
  await tabForward();
  await expect
    .element(page.getByRole("button", { name: "Craft activity" }))
    .toHaveFocus();
  await userEvent.keyboard("{Enter}");

  await submitted.promise;
  expect(newActivityAction).toHaveBeenCalledOnce();
});

test.each([
  {
    id: "find-something-to-make",
    name: "Find something to make",
    project: NEW_CHAT_COPY.noProject,
  },
  {
    id: "brainstorming",
    name: "Brainstorming",
    project: NEW_CHAT_COPY.noProject,
  },
  {
    id: BRAINSTORMING_CLONE.id,
    name: BRAINSTORMING_CLONE.name,
    project: NEW_CHAT_COPY.noProject,
  },
  {
    id: "project-breakdown",
    name: "Project Breakdown",
    project: NEW_CHAT_COPY.noProject,
  },
])(
  "The $name title opens New chat and submits that activity",
  async (activity) => {
    signInAs(SIGNED_IN_USER);
    vi.mocked(startChatAction).mockClear();
    vi.mocked(listOwnActivities).mockResolvedValue([BRAINSTORMING_CLONE]);
    const submitted = Promise.withResolvers<FormData>();
    vi.mocked(startChatAction).mockImplementation((_state, form) => {
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
    const trigger = page.getByRole("button", {
      name: ACTIVITIES_COPY.startLabel(activity.name),
      exact: true,
    });
    await trigger.click();
    const dialog = page.getByRole("dialog", {
      name: NEW_CHAT_COPY.dialogHeading,
    });
    await expect.element(dialog).toBeVisible();
    await expect
      .element(
        dialog.getByRole("combobox", { name: NEW_CHAT_COPY.activityLabel }),
      )
      .not.toBeInTheDocument();
    const projects = dialog.getByRole("combobox", {
      name: NEW_CHAT_COPY.projectLabel,
    });
    await expect.element(projects).toHaveDisplayValue(activity.project);
    await expect
      .element(
        projects.getByRole("option", {
          name: NEW_CHAT_COPY.newProject,
          exact: true,
        }),
      )
      .toBeInTheDocument();
    await projects.selectOptions(PROJECT.id);
    await page.getByRole("button", { name: NEW_CHAT_COPY.closeDialog }).click();
    await expect.element(trigger).toHaveFocus();
    expect(startChatAction).not.toHaveBeenCalled();
    await userEvent.keyboard("{Enter}");
    await page
      .getByRole("combobox", { name: NEW_CHAT_COPY.projectLabel })
      .selectOptions(PROJECT.id);
    await page
      .getByRole("button", { name: NEW_CHAT_COPY.start, exact: true })
      .click();
    const sent = await submitted.promise;
    expect(sent.get("activityId")).toBe(activity.id);
    expect(sent.get("projectId")).toBe(PROJECT.id);
  },
);

vi.mock("@/app/(workspace)/projects/premade-actions.ts", () => ({
  startPremadeQuestAction: vi.fn(),
}));
vi.mock("@/constructs/interview-construct.ts", () => ({
  interviewConstruct: vi.fn().mockResolvedValue({ id: "vellum" }),
}));
