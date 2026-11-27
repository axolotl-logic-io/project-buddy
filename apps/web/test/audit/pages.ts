import { expect, type Locator, type Page } from "@playwright/test";
import { CREDITS_COPY } from "@/ui/copy/credits.ts";
import { GRIMOIRE_COPY } from "@/ui/copy/grimoire.ts";
import { LOGIN_COPY } from "@/ui/copy/login.ts";
import { QUEST_OVERVIEW_COPY } from "@/ui/copy/quest-overview.ts";
import { NEW_QUEST_COPY } from "@/ui/copy/quests.ts";
import { QUICK_ADD_COPY } from "@/ui/copy/quick-add.ts";
import { SIGNUP_COPY } from "@/ui/copy/signup.ts";
import { SITE_COPY, SITE_PANEL_COPY } from "@/ui/copy/site.ts";
import type { TestData } from "../support/test-database/data-test-kit.ts";
import { waitForHydrated } from "../system/page-helpers.ts";
import type { PageName } from "./options.ts";

const SEED_SUFFIX_LENGTH = 8;

type Marker = (page: Page) => Locator;

interface Seed {
  readonly questId: string;
  readonly quest: string;
  readonly task: string;
  readonly riteId: string;
  readonly rite: string;
}

interface Destination {
  readonly path: string;
  readonly marker: Marker;
}

interface AuditPage extends Destination {
  readonly signedOut?: true;
  readonly ownContent?: true;
  readonly change: {
    readonly from: string;
    readonly panel?: true;
    readonly link: string;
    readonly to?: Destination;
  };
  readonly dialog?: string;
}

async function seedPages(testData: TestData): Promise<Seed> {
  const suffix = crypto.randomUUID().slice(0, SEED_SUFFIX_LENGTH);
  const quest = await testData.quest(`Audit garden ${suffix}`);
  const task = `Order seeds ${suffix}`;
  await testData.task(quest, task);
  const rite = await testData.rite(`Audit morning pages ${suffix}`);
  return {
    questId: quest.id,
    quest: quest.name,
    task,
    riteId: rite.id,
    rite: rite.name,
  };
}

function mainText(text: string): Marker {
  return (page: Page): Locator =>
    page.getByRole("main").getByText(text, { exact: true }).first();
}

function mainLink(name: string): Marker {
  return (page: Page): Locator =>
    page.getByRole("main").getByRole("link", { name, exact: true }).first();
}

function auditPages(seed: Seed): Record<PageName, AuditPage> {
  const home = {
    path: "/",
    marker: mainText(seed.task),
    ownContent: true,
    change: { from: "/quests", panel: true, link: "Home" },
  } satisfies AuditPage;
  return {
    login: {
      path: "/login",
      signedOut: true,
      marker: mainText(LOGIN_COPY.intro),
      change: { from: "/signup", link: SIGNUP_COPY.signInLink },
    },
    signup: {
      path: "/signup",
      signedOut: true,
      marker: mainText(SIGNUP_COPY.intro),
      change: { from: "/login", link: LOGIN_COPY.signUpLink },
    },
    credits: {
      path: "/credits",
      signedOut: true,
      marker: mainText(CREDITS_COPY.heading),
      change: { from: "/login", panel: true, link: CREDITS_COPY.panelLink },
    },
    home,
    quests: {
      path: "/quests",
      marker: mainLink(seed.quest),
      ownContent: true,
      change: { from: "/", panel: true, link: "Quests" },
      dialog: NEW_QUEST_COPY.open,
    },
    overview: {
      path: `/quests/${seed.questId}`,
      marker: mainText(seed.task),
      ownContent: true,
      change: { from: "/quests", link: seed.quest },
      dialog: QUEST_OVERVIEW_COPY.performRiteOn("Tasks"),
    },
    grimoire: {
      path: "/grimoire",
      marker: mainLink(seed.rite),
      ownContent: true,
      change: { from: "/", panel: true, link: GRIMOIRE_COPY.heading },
    },
    rite: {
      path: `/grimoire/${seed.riteId}`,
      marker: (page: Page): Locator =>
        page
          .getByRole("main")
          .getByRole("textbox", { name: GRIMOIRE_COPY.name }),
      ownContent: true,
      change: { from: "/grimoire", link: seed.rite },
    },
    construct: {
      path: "/constructs/vellum",
      marker: mainText("Visuals"),
      // There is no link to the construct page. Measure its link back to Home.
      change: { from: "/constructs/vellum", link: SITE_COPY.name, to: home },
    },
    timer: {
      path: "/timer",
      marker: (page: Page): Locator =>
        page.getByRole("combobox", { name: "Work for" }),
      change: { from: "/", panel: true, link: "Timer" },
    },
    profile: {
      path: "/profile",
      marker: (page: Page): Locator =>
        page
          .getByRole("main")
          .getByRole("textbox", { name: "Name", exact: true }),
      change: { from: "/", panel: true, link: "Profile" },
    },
    settings: {
      path: "/settings",
      marker: (page: Page): Locator =>
        page.getByRole("heading", { name: "Appearance", exact: true }),
      change: { from: "/", panel: true, link: "Settings" },
    },
  };
}

async function openSitePanel(page: Page): Promise<void> {
  const panel = page.getByRole("button", {
    name: SITE_PANEL_COPY.title,
    exact: true,
  });
  await waitForHydrated(panel);
  await panel.click();
}

// Pages with shared content expose the account's quest list via Quick Add.
async function checkAccount(page: Page, seed: Seed): Promise<void> {
  await openSitePanel(page);
  await page.getByRole("button", { name: QUICK_ADD_COPY.panelItem }).click();
  const dialog = page.getByRole("dialog", { name: QUICK_ADD_COPY.heading });
  try {
    await expect(
      dialog.getByRole("combobox", { name: QUICK_ADD_COPY.questLabel }),
      "account check: Quick Add must show the signed-in account's seeded quest",
    ).toHaveValue(seed.questId);
  } finally {
    const close = dialog.getByRole("button", { name: QUICK_ADD_COPY.close });
    if (await close.isVisible()) {
      await close.click();
      await dialog.waitFor({ state: "hidden" });
    }
  }
}

async function checkRiteName(marker: Locator, name: string): Promise<void> {
  await expect(
    marker,
    "account check: expected the signed-in account's seeded rite",
  ).toHaveValue(name);
}

async function checkContent(
  page: Page,
  name: PageName,
  target: AuditPage,
  seed: Seed,
): Promise<void> {
  const marker = target.marker(page);
  await expect(
    marker,
    "page content check: expected the audited page's content",
  ).toBeVisible();
  if (name === "rite") {
    await checkRiteName(marker, seed.rite);
  }
  if (target.ownContent !== true && target.signedOut !== true) {
    await checkAccount(page, seed);
  }
}

export type { AuditPage, Seed };
export { auditPages, checkContent, openSitePanel, seedPages };
