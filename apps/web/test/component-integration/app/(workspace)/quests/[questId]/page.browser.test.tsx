import { beforeEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import QuestLayout from "@/app/(workspace)/quests/[questId]/(overview)/layout.tsx";
import QuestPage from "@/app/(workspace)/quests/[questId]/(overview)/page.tsx";
import { changeQuestDay } from "@/dailies/quest-day-actions.ts";
import { listQuestPeople } from "@/quests/membership-store.ts";
import { getQuest, type Quest } from "@/quests/store.ts";
import { SPACE_ID } from "@/spaces/space.ts";
import { listSpaces, type Space } from "@/spaces/space-store.ts";
import { SIGNED_IN_USER, signInAs } from "../../../../auth/current-user-test-kit.ts";
import { inWorkspace } from "../../../workspace-test-kit.tsx";
import { FOX_QUEST } from "../../page-fixtures.ts";

vi.mock("@/auth/current-user.ts", () => import("../../../../auth/current-user-test-kit.ts"));
vi.mock("@/quests/store.ts", () => ({ getQuest: vi.fn() }));
vi.mock("next/navigation", () => import("../../../../components/router-test-kit.ts"));

const SPACE: Space = {
  id: SPACE_ID.parse("a0c7c952-9f82-4640-9584-45e01b0c2513"),
  position: 0, name: "Bench", singular: "piece", plural: "pieces",
  checkOff: "Finish", uncheck: "Resume", newType: "task", version: 0,
};

beforeEach(() => {
  signInAs(SIGNED_IN_USER);
  vi.mocked(listSpaces).mockResolvedValue([SPACE]);
  vi.mocked(listQuestPeople).mockResolvedValue(undefined);
});

async function open(quest: Quest, section?: string): Promise<void> {
  vi.mocked(getQuest).mockResolvedValue(quest);
  const params = Promise.resolve({ questId: quest.id });
  const content = await QuestPage({ params, searchParams: Promise.resolve({ section }) });
  await render(inWorkspace(<QuestLayout params={params}>{content}</QuestLayout>));
}

test("use_case_open_quest", async () => {
  await open(FOX_QUEST);
  await expect.element(page.getByRole("heading", { name: "Next task" })).toBeVisible();
  await expect.element(page.getByRole("link", { name: SPACE.name })).toHaveAttribute("href", `/quests/${FOX_QUEST.id}?section=${SPACE.id}`);
  await expect.element(page.getByRole("link", { name: "Rites & status" })).toBeVisible();
  await expect.element(page.getByRole("link", { name: "Performances" })).toBeVisible();
  await expect.element(page.getByRole("textbox", { name: "Conjuration" })).not.toBeInTheDocument();
});

test("use_case_dailies", async () => {
  vi.mocked(changeQuestDay).mockResolvedValue({ kind: "saved" });
  await open({ ...FOX_QUEST, dailies: true });
  await page.getByRole("button", { name: "Start Day" }).click();
  const dialog = page.getByRole("dialog", { name: "Start Day" });
  const space = dialog.getByRole("checkbox", { name: SPACE.name });
  await expect.element(space).not.toBeChecked();
  await space.click();
  await dialog.getByRole("button", { name: "Start Day", exact: true }).click();
  expect(changeQuestDay).toHaveBeenCalledWith(expect.objectContaining({ emptySpaces: [SPACE.id], questId: FOX_QUEST.id }));
});

test("use_case_tailored_quest_overviews", async () => {
  await open({ ...FOX_QUEST, name: "Morning", dailies: true, status: "completed" });
  await expect.element(page.getByRole("link", { name: "Day grid" })).toBeVisible();
  await expect.element(page.getByRole("button", { name: "Start Day" })).not.toBeInTheDocument();
});

test("use_case_tasks_panel", async () => {
  await open(FOX_QUEST, SPACE.id);
  await expect.element(page.getByRole("heading", { name: "Bench" })).toBeVisible();
  await expect.element(page.getByRole("button", { name: "Add piece" })).toBeVisible();
  await expect.element(page.getByRole("link", { name: "Back to overview" })).toHaveAttribute("href", `/quests/${FOX_QUEST.id}`);
});

test("use_case_timer_quest_panel", async () => {
  await open(FOX_QUEST);
  await page.getByRole("button", { name: "Open timer", exact: false }).click();
  await expect.element(page.getByRole("button", { name: "Start timer", exact: false })).toBeVisible();
});
