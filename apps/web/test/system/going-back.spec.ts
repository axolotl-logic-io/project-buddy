// The browser's Back and Forward buttons across the signed-in site, which
// only the built site's App Router can show: its router cache, its
// redirects after a Server Action, the header slot, and choices kept in the
// address. Each test is grouped under the use case whose pages it goes back
// through.

import { expect, type Page } from "@playwright/test";
import type { User } from "@/accounts/users-store.ts";
import type { QuestId } from "@/ids.ts";
import { answerInvitation, inviteToQuest } from "@/quests/membership-store.ts";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";
import { CREDITS_COPY } from "@/ui/copy/credits.ts";
import { FINDER_COPY } from "@/ui/copy/finder.ts";
import { GRIMOIRE_COPY } from "@/ui/copy/grimoire.ts";
import { HOME_COPY } from "@/ui/copy/home.ts";
import { PROBLEMS_COPY } from "@/ui/copy/problems.ts";
import { QUEST_MEMBERS_COPY } from "@/ui/copy/quest-members.ts";
import { QUEST_STATUS_COPY } from "@/ui/copy/quest-status.ts";
import {
  NEW_QUEST_COPY,
  QUEST_COPY,
  QUEST_FINDER_COPY,
} from "@/ui/copy/quests.ts";
import { SITE_PANEL_COPY } from "@/ui/copy/site.ts";
import { testData as dataOf } from "../support/test-database/data-test-kit.ts";
import { test } from "./fixtures.ts";
import { logIn } from "./log-in.ts";
import { waitForHydrated } from "./page-helpers.ts";

// Tab names, which end in their counts, and addresses the tests wait for.
const COMPLETED_TAB = /^Completed/u;
const ACTIVE_TAB = /^Active/u;
const GARD_SEARCH = /[?&]q=Gard(?:&|$)/u;
const COMPLETED_STATUS = /[?&]status=completed(?:&|$)/u;
const QUEST_PAGE = /\/quests\/[^/?]+$/u;
const YOURS_TAB = /^Yours/u;
const OWN_FILTER = /filter=own/u;
const MORNING_SEARCH = /q=Morning/u;
const FORGOTTEN_FILTER = /filter=forgotten/u;
const TIMER_25_15 = /^[^?]*\/timer\/25\/15\/\d+/u;
const SIGN_IN_PAGE = /\/login/u;

// The trail band's heading, which names the page.
function trailHeading(page: Page): ReturnType<Page["getByRole"]> {
  return page
    .getByRole("region", { name: "Breadcrumbs" })
    .getByRole("heading", { level: 1 });
}

// Checks the trail band names the page heading, under the parents given.
async function expectTrail(
  page: Page,
  heading: string,
  parents: readonly string[],
): Promise<void> {
  await expect(trailHeading(page)).toHaveText(heading);
  const links = page
    .getByRole("navigation", { name: "Breadcrumbs" })
    .getByRole("link");
  await expect(links).toHaveText([...parents]);
}

// The quests listed under the status chosen on Quests.
function listedQuests(page: Page): ReturnType<Page["getByRole"]> {
  return page.getByRole("tabpanel");
}

// Opens the quest from Quests, as the Active tab lists it.
async function openFromQuests(page: Page, name: string): Promise<void> {
  await page.getByRole("link", { name: "Quests", exact: true }).click();
  await listedQuests(page).getByRole("link", { name, exact: true }).click();
  await expectTrail(page, name, ["Home", "Quests"]);
}

// Makes member an accepted member of the owner's quest.
async function addMember(
  owner: User,
  questId: QuestId,
  member: User,
): Promise<void> {
  const invited = await inviteToQuest(
    owner.id,
    { questId, email: member.email, origin: "http://localhost" },
    new Date(),
  );
  if (invited.kind !== "invited") {
    throw new Error(`Inviting a member answered ${invited.kind}`);
  }
  if (!(await answerInvitation(member.id, questId, true))) {
    throw new Error("The member's invitation wasn't accepted");
  }
}

test.describe("use_case_open_quest", () => {
  test("Back and Forward keep the trail band in step with the page", async ({
    account,
    page,
    testData,
  }) => {
    const quest = await testData.quest("Garden");
    await testData.task(quest, "Order seeds");
    const rite = await testData.rite("Morning pages");
    await logIn(page, account);

    await test.step("going forward through the site", async () => {
      await page.getByRole("link", { name: "Quests", exact: true }).click();
      await expectTrail(page, "Quests", ["Home"]);
      await page
        .getByRole("tabpanel")
        .getByRole("link", { name: "Garden" })
        .click();
      await expectTrail(page, "Garden", ["Home", "Quests"]);
      await page.getByRole("link", { name: "Home", exact: true }).click();
      await page.getByRole("link", { name: "Grimoire", exact: true }).click();
      await expectTrail(page, "Grimoire", ["Home"]);
      await page.getByRole("link", { name: rite.name }).click();
      await expectTrail(page, rite.name, ["Home", "Grimoire"]);
    });

    await test.step("Back walks the trail band back", async () => {
      await page.goBack();
      await expectTrail(page, "Grimoire", ["Home"]);
      await page.goBack();
      await expectTrail(page, HOME_COPY.heading, []);
      await page.goBack();
      await expectTrail(page, "Garden", ["Home", "Quests"]);
      await page.goBack();
      await expectTrail(page, "Quests", ["Home"]);
    });

    await test.step("Forward walks it forward again", async () => {
      await page.goForward();
      await expectTrail(page, "Garden", ["Home", "Quests"]);
      await page.goForward();
      await expectTrail(page, HOME_COPY.heading, []);
      await page.goForward();
      await expectTrail(page, "Grimoire", ["Home"]);
      await page.goForward();
      await expectTrail(page, rite.name, ["Home", "Grimoire"]);
      await expect(page).toHaveURL(`/grimoire/${rite.id}`);
    });
  });
});

test.describe("use_case_home_tasks", () => {
  test("a task checked off in its quest has left Home after Back", async ({
    account,
    page,
    testData,
  }) => {
    const quest = await testData.quest("Garden");
    await testData.task(quest, "Order seeds");
    await logIn(page, account);
    const tasks = page.getByRole("region", {
      name: HOME_COPY.tasksHeading,
      exact: true,
    });
    await expect(
      tasks.getByRole("checkbox", { name: "Order seeds" }),
    ).toBeVisible();

    await tasks.getByRole("link", { name: "Garden" }).click();
    const checkOff = page
      .getByRole("list", { name: "Tasks" })
      .getByRole("checkbox", { name: "Check off" });
    await waitForHydrated(checkOff);
    await checkOff.click();
    await expect(page.getByRole("list", { name: "Tasks" })).toHaveCount(0);

    await page.goBack();

    await expect(trailHeading(page)).toHaveText(HOME_COPY.heading);
    await expect(tasks.getByText(HOME_COPY.noTasks)).toBeVisible();
    await expect(
      tasks.getByRole("checkbox", { name: "Order seeds" }),
    ).toHaveCount(0);
  });
});

test.describe("use_case_find_quest", () => {
  test("Back from a found quest brings the search and status back, and typing added no steps to Back", async ({
    account,
    page,
    testData,
  }) => {
    const quest = await testData.quest("Garden");
    await logIn(page, account);
    await page.getByRole("link", { name: "Quests", exact: true }).click();
    const completed = page.getByRole("tab", { name: COMPLETED_TAB });
    await waitForHydrated(completed);
    await completed.click();
    await expect(page).toHaveURL("/quests?status=completed");
    const search = page.getByRole("searchbox", {
      name: QUEST_FINDER_COPY.searchLabel,
    });
    await search.pressSequentially("Gard");
    await expect(page).toHaveURL(GARD_SEARCH);
    await expect(page).toHaveURL(COMPLETED_STATUS);

    await page.getByRole("link", { name: quest.name, exact: true }).click();
    await expectTrail(page, quest.name, ["Home", "Quests"]);
    await page.goBack();

    await expect(page).toHaveURL(GARD_SEARCH);
    await expect(page).toHaveURL(COMPLETED_STATUS);
    await expect(search).toHaveValue("Gard");
    await expect(
      page.getByRole("link", { name: quest.name, exact: true }),
    ).toBeVisible();
    // The status tabs give way to the results while a search is typed.
    await page.getByRole("button", { name: FINDER_COPY.clear }).click();
    await expect(completed).toHaveAttribute("aria-selected", "true");

    await page.goBack();
    await expectTrail(page, HOME_COPY.heading, []);
  });
});

test.describe("use_case_view_quests", () => {
  test("Back to Quests keeps the status chosen there", async ({
    account,
    page,
  }) => {
    await logIn(page, account);
    await page.getByRole("link", { name: "Quests", exact: true }).click();
    const completed = page.getByRole("tab", { name: COMPLETED_TAB });
    await waitForHydrated(completed);
    await completed.click();
    await expect(page).toHaveURL("/quests?status=completed");

    await page.getByRole("link", { name: "Home", exact: true }).click();
    await expectTrail(page, HOME_COPY.heading, []);
    await page.goBack();

    await expect(page).toHaveURL("/quests?status=completed");
    await expect(completed).toHaveAttribute("aria-selected", "true");
  });
});

test.describe("use_case_grimoire_page", () => {
  test("Back to the Grimoire keeps the tab and search chosen there", async ({
    account,
    page,
    testData,
  }) => {
    const rite = await testData.rite("Morning pages");
    await logIn(page, account);
    await page.getByRole("link", { name: "Grimoire", exact: true }).click();
    const yours = page.getByRole("tab", { name: YOURS_TAB });
    await waitForHydrated(yours);
    await yours.click();
    const search = page.getByRole("searchbox", { name: "Find a rite" });
    await search.pressSequentially("Morning");
    await expect(page).toHaveURL(OWN_FILTER);
    await expect(page).toHaveURL(MORNING_SEARCH);

    await page.getByRole("link", { name: rite.name }).click();
    await expectTrail(page, rite.name, ["Home", "Grimoire"]);
    await page.goBack();

    await expect(yours).toHaveAttribute("aria-selected", "true");
    await expect(search).toHaveValue("Morning");
    await expect(page.getByRole("link", { name: rite.name })).toBeVisible();
  });
});

test.describe("use_case_retire_definitions", () => {
  test("Back from the Forgotten tab shows the rite forgotten, not editable", async ({
    account,
    page,
    testData,
  }) => {
    // Fails today: Back restores the router's cached copy of the page from
    // before the change, which the Server Action's refresh() never updated.
    test.fail();
    const rite = await testData.rite("Morning pages");
    await logIn(page, account);
    await page.goto(`/grimoire/${rite.id}`);
    const forget = page.getByRole("button", { name: GRIMOIRE_COPY.forget });
    await waitForHydrated(forget);
    await forget.click();
    await expect(page).toHaveURL(FORGOTTEN_FILTER);
    await expect(
      page.getByText(GRIMOIRE_COPY.changed.forget(rite.name)),
    ).toBeVisible();

    await page.goBack();

    await expect(page).toHaveURL(`/grimoire/${rite.id}`);
    await expect(
      page.getByRole("button", { name: GRIMOIRE_COPY.restore }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Save rite" })).toHaveCount(
      0,
    );
  });
});

test.describe("use_case_delete_retired_definition", () => {
  test("Back to a deleted rite's page says it can't be found", async ({
    account,
    page,
    testData,
  }) => {
    // Fails today: Back restores the router's cached copy of the page from
    // before the change, which the Server Action's refresh() never updated.
    test.fail();
    const rite = await testData.rite("Morning pages");
    await logIn(page, account);
    await page.goto(`/grimoire/${rite.id}`);
    const forget = page.getByRole("button", { name: GRIMOIRE_COPY.forget });
    await waitForHydrated(forget);
    await forget.click();
    await expect(page).toHaveURL(FORGOTTEN_FILTER);
    const remove = page.getByRole("button", { name: GRIMOIRE_COPY.delete });
    await waitForHydrated(remove);
    await remove.click();
    await page
      .getByRole("alertdialog", {
        name: GRIMOIRE_COPY.confirmDelete(rite.name),
      })
      .getByRole("button", { name: GRIMOIRE_COPY.delete })
      .click();
    await expect(page.getByText(GRIMOIRE_COPY.changed.delete)).toBeVisible();

    await test.step("Back to the Forgotten tab no longer lists it", async () => {
      await page.goBack();

      await expect(page).toHaveURL(FORGOTTEN_FILTER);
      await expect(page.getByRole("link", { name: rite.name })).toHaveCount(0);
    });

    await test.step("Back to its page says it can't be found", async () => {
      await page.goBack();

      await expect(page).toHaveURL(`/grimoire/${rite.id}`);
      await expect(
        page.getByRole("heading", { name: PROBLEMS_COPY.notFoundHeading }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: GRIMOIRE_COPY.restore }),
      ).toHaveCount(0);
    });
  });
});

test.describe("use_case_remove_quest_member", () => {
  test("Back to a quest the member left shows it as missing", async ({
    account,
    otherAccount,
    page,
  }) => {
    const quest = await dataOf(otherAccount).quest("Shared garden");
    await addMember(otherAccount, quest.id, account);
    await logIn(page, account);
    await page.getByRole("link", { name: "Quests", exact: true }).click();
    await page
      .getByRole("tabpanel")
      .getByRole("link", { name: quest.name })
      .click();
    await expectTrail(page, quest.name, ["Home", "Quests"]);
    await page.goto(`/quests/${quest.id}?section=members`);
    const leave = page.getByRole("button", { name: QUEST_MEMBERS_COPY.leave });
    await waitForHydrated(leave);
    await leave.click();
    await page
      .getByRole("alertdialog", { name: QUEST_MEMBERS_COPY.leave })
      .getByRole("button", { name: QUEST_MEMBERS_COPY.leaveConfirmButton })
      .click();
    await expect(page).toHaveURL("/");

    await page.goBack();

    await expect(page).toHaveURL(`/quests/${quest.id}`);
    await expect(
      page.getByRole("heading", { name: PROBLEMS_COPY.notFoundHeading }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: quest.name }),
    ).toHaveCount(0);
  });
});

test.describe("use_case_timer_return_to_setup", () => {
  test("Back from a timer offers its lengths, and Forward returns to the same timer", async ({
    account,
    page,
  }) => {
    await logIn(page, account);
    await page.getByRole("link", { name: "Timer", exact: true }).click();
    const work = page.getByRole("combobox", { name: "Work for" });
    const rest = page.getByRole("combobox", { name: "Break for" });
    await waitForHydrated(work);
    await work.selectOption({ label: "25 minutes" });
    await rest.selectOption({ label: "15 minutes" });
    await page.getByRole("button", { name: "Start", exact: true }).click();
    await expect(page).toHaveURL(TIMER_25_15);
    const timerUrl = page.url();

    await page.goBack();

    await expect(page).toHaveURL("/timer");
    await expect(work).toHaveValue("25");
    await expect(rest).toHaveValue("15");

    await page.goForward();
    await expect(page).toHaveURL(timerUrl);
  });
});

test.describe("use_case_sign_out", () => {
  test("Back after signing out shows nothing of the account", async ({
    account,
    page,
    testData,
  }) => {
    const quest = await testData.quest("Private garden");
    await logIn(page, account);
    await page.goto(`/quests/${quest.id}`);
    await expectTrail(page, quest.name, ["Home", "Quests"]);
    await page.goto("/settings#security");
    const signOut = page.getByRole("button", {
      exact: true,
      name: ACCOUNT_COPY.signOut,
    });
    await waitForHydrated(signOut);
    await signOut.click();
    await expect(page).toHaveURL(SIGN_IN_PAGE);

    await page.goBack();
    await page.goBack();

    await expect(page.getByText(quest.name)).toHaveCount(0);
    await expect(page).toHaveURL(SIGN_IN_PAGE);
  });
});

test.describe("use_case_new_quest", () => {
  test("Back from a new quest returns to Quests with it listed once and the dialog closed", async ({
    account,
    page,
  }) => {
    // Fails today: Back restores the router's cached copy of Quests from
    // before the quest was started, which lists none.
    test.fail();
    await logIn(page, account);
    await page.getByRole("link", { name: "Quests", exact: true }).click();
    const open = page.getByRole("button", {
      name: NEW_QUEST_COPY.open,
      exact: true,
    });
    await waitForHydrated(open);
    await open.click();
    const dialog = page.getByRole("dialog", { name: NEW_QUEST_COPY.title });
    await dialog
      .getByRole("textbox", { name: NEW_QUEST_COPY.nameLabel, exact: true })
      .fill("Pottery");
    await dialog.getByRole("button", { name: NEW_QUEST_COPY.start }).click();
    await expect(page).toHaveURL(QUEST_PAGE);
    await expectTrail(page, "Pottery", ["Home", "Quests"]);

    await page.goBack();

    await expect(page).toHaveURL("/quests");
    await expect(dialog).toHaveCount(0);
    await expect(
      listedQuests(page).getByRole("link", { name: "Pottery", exact: true }),
    ).toHaveCount(1);
  });
});

test.describe("use_case_rename_quest", () => {
  test("Back to Quests after renaming a quest lists it by its new name", async ({
    account,
    page,
    testData,
  }) => {
    await testData.quest("Garden");
    await logIn(page, account);
    await openFromQuests(page, "Garden");
    const rename = page.getByRole("button", { name: QUEST_COPY.rename });
    await waitForHydrated(rename);
    await rename.click();
    await page
      .getByRole("textbox", { name: QUEST_COPY.titleLabel })
      .fill("Vegetable garden");
    await page.getByRole("button", { name: QUEST_COPY.saveTitle }).click();
    await expect(page.getByText(QUEST_COPY.titleSaved)).toBeVisible();

    await page.goBack();

    await expect(page).toHaveURL("/quests");
    await expect(
      listedQuests(page).getByRole("link", { name: "Vegetable garden" }),
    ).toBeVisible();
    await expect(
      listedQuests(page).getByRole("link", { name: "Garden", exact: true }),
    ).toHaveCount(0);
  });
});

test.describe("use_case_change_quest_status", () => {
  test("Back to Quests after completing a quest lists it under Completed, not Active", async ({
    account,
    page,
    testData,
  }) => {
    await testData.quest("Garden");
    await logIn(page, account);
    await openFromQuests(page, "Garden");
    const complete = page.getByRole("button", {
      name: QUEST_STATUS_COPY.complete,
      exact: true,
    });
    await waitForHydrated(complete);
    await complete.click();
    await expect(
      page.getByText(QUEST_STATUS_COPY.saved.completed),
    ).toBeVisible();

    await page.goBack();

    await expect(page).toHaveURL("/quests");
    await expect(page.getByRole("tab", { name: ACTIVE_TAB })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(
      listedQuests(page).getByRole("link", { name: "Garden", exact: true }),
    ).toHaveCount(0);
    await page.getByRole("tab", { name: COMPLETED_TAB }).click();
    await expect(
      listedQuests(page).getByRole("link", { name: "Garden", exact: true }),
    ).toBeVisible();
  });
});

test.describe("use_case_open_missing_page", () => {
  test("Back from a missing quest brings Quests back whole", async ({
    account,
    page,
    testData,
  }) => {
    await testData.quest("Garden");
    await logIn(page, account);
    await page.getByRole("link", { name: "Quests", exact: true }).click();
    await expectTrail(page, "Quests", ["Home"]);
    await page.goto("/quests/no-such-quest");
    await expect(
      page.getByRole("heading", { name: PROBLEMS_COPY.notFoundHeading }),
    ).toBeVisible();

    await page.goBack();

    await expectTrail(page, "Quests", ["Home"]);
    await expect(
      page.getByRole("heading", { name: PROBLEMS_COPY.notFoundHeading }),
    ).toHaveCount(0);
    await expect(
      listedQuests(page).getByRole("link", { name: "Garden", exact: true }),
    ).toBeVisible();
  });
});

test.describe("use_case_see_icon_credit", () => {
  test("Back from Credits brings Home's header back with the page", async ({
    account,
    page,
  }) => {
    await logIn(page, account);
    const panelButton = page.getByRole("button", {
      name: SITE_PANEL_COPY.title,
    });
    await waitForHydrated(panelButton);
    await panelButton.click();
    await page
      .getByRole("link", { name: CREDITS_COPY.panelLink, exact: true })
      .click();
    await expect(page).toHaveURL("/credits");
    const credits = page.getByRole("heading", {
      level: 1,
      name: CREDITS_COPY.heading,
    });
    await expect(credits).toBeVisible();

    await page.goBack();

    await expectTrail(page, HOME_COPY.heading, []);
    await expect(credits).toHaveCount(0);
    await page.goForward();
    await expect(credits).toBeVisible();
    await expect(trailHeading(page)).toHaveCount(0);
  });
});
