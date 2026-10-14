import { expect, type Locator, type Page } from "@playwright/test";
import {
  cloneBuddy,
  getUserBuddy,
  type UserBuddy,
  updateBuddy,
} from "@/buddies/buddy-store.ts";
import { type BuddyParts, getBuddy, listBuddies } from "@/buddies/index.ts";
import {
  BUDDIES_COPY,
  BUDDY_COPY,
  BUDDY_PARTS_COPY,
} from "@/ui/copy/buddies.ts";
import {
  clone,
  customize,
  expectMechanicsHidden,
  expectMechanicsShown,
  expectNameInPrompt,
  partField,
  press,
  showMechanics,
} from "./buddy-page.ts";
import type { TestData } from "./fixtures.ts";
import { test } from "./fixtures.ts";
import { logIn } from "./log-in.ts";
import { fillWhenReady } from "./page-helpers.ts";

const BUILT_IN_NAMES = listBuddies().map((buddy) => buddy.name);

// A buddy's page: its own address, a UUID's.
const OWN_BUDDY_PAGE = /\/buddies\/[0-9a-f-]{36}$/u;

// The names in one of the page's lists: the built-in buddies or her own.
function namesIn(page: Page, heading: string): Locator {
  return page
    .getByRole("region", { name: heading })
    .getByRole("listitem")
    .locator(".card-title");
}

// Her own account starts with no buddies, whatever other tests make.
test("use_case_view_buddies", async ({ account, page }) => {
  await logIn(page, account);
  await page.goto("/buddies");

  await expect(
    page.getByRole("heading", { level: 1, name: BUDDIES_COPY.heading }),
  ).toBeVisible();
  await expect(namesIn(page, BUDDIES_COPY.builtInHeading)).toHaveText(
    BUILT_IN_NAMES,
  );
  await expect(
    page
      .getByRole("region", { name: BUDDIES_COPY.ownHeading })
      .getByText(BUDDIES_COPY.noOwn),
  ).toBeVisible();
  await Promise.all(
    BUILT_IN_NAMES.map((name) =>
      expect(
        page.getByRole("button", {
          exact: true,
          name: BUDDIES_COPY.customizeLabel(name),
        }),
      ).toBeVisible(),
    ),
  );
});

test("use_case_customize_buddy", async ({ account, page }) => {
  await logIn(page, account);
  await page.goto("/buddies");
  const own = namesIn(page, BUDDIES_COPY.ownHeading);
  let copyUrl = "";

  await test.step("customizing a built-in buddy opens a copy of her own", async () => {
    await customize(page, "Hippy");

    await expect(page).toHaveURL(OWN_BUDDY_PAGE);
    await expect(
      page.getByRole("heading", { level: 1, name: "Hippy (clone)" }),
    ).toBeVisible();
    copyUrl = new URL(page.url()).pathname;
  });

  await test.step("tweaking one of hers opens its page", async () => {
    await page.goto("/buddies");
    const tweak = page.getByRole("link", {
      exact: true,
      name: BUDDIES_COPY.tweakLabel("Hippy (clone)"),
    });
    await tweak.click();

    await expect(page).toHaveURL(copyUrl);
  });

  await test.step("cloning one of hers adds a clone of the clone", async () => {
    await page.goto("/buddies");
    await clone(page, "Hippy (clone)");

    await expect(page).toHaveURL("/buddies");
    await expect(own).toHaveText(["Hippy (clone)", "Hippy (clone) (clone)"]);
    await expect(namesIn(page, BUDDIES_COPY.builtInHeading)).toHaveText(
      BUILT_IN_NAMES,
    );
  });
});

// A signed-in page, by name, and its address in a project with one chat.
interface SignedInPage {
  readonly name: string;
  readonly address: (projectId: string, chatId: string) => string;
}

const SIGNED_IN_PAGES: readonly SignedInPage[] = [
  { name: "the projects list", address: (): string => "/projects" },
  {
    name: "a project",
    address: (projectId: string): string => `/projects/${projectId}`,
  },
  {
    name: "a project's memory",
    address: (projectId: string): string => `/projects/${projectId}/memory`,
  },
  {
    name: "the new-chat form",
    address: (projectId: string): string => `/chats/new?projectId=${projectId}`,
  },
  {
    name: "a chat",
    address: (_projectId: string, chatId: string): string => `/chats/${chatId}`,
  },
  { name: "the Settings page", address: (): string => "/settings" },
  { name: "the account page", address: (): string => "/account" },
  { name: "the buddies page", address: (): string => "/buddies" },
];

// She goes to her buddies by the header's Buddies link, from any
// signed-in page.
test.describe("use_case_view_buddies", () => {
  for (const signedInPage of SIGNED_IN_PAGES) {
    test(`from the header on ${signedInPage.name}`, async ({
      page,
      testData,
    }) => {
      const project = await testData.project();
      const chat = await testData.chat(project);
      await logIn(page, testData.account);
      await page.goto(signedInPage.address(project.id, chat.id));

      await page
        .getByRole("banner")
        .getByRole("link", { name: BUDDIES_COPY.headerLink })
        .click();

      await expect(page).toHaveURL("/buddies");
      await expect(
        page.getByRole("heading", { level: 1, name: BUDDIES_COPY.heading }),
      ).toBeVisible();
    });
  }
});

const MR_TEE: BuddyParts = getBuddy("mr-tee").parts;

// Her clone of Mr. Tee, made straight in the store.
async function cloneMrTee(testData: TestData): Promise<UserBuddy> {
  const copy = await cloneBuddy(testData.account.id, "mr-tee");
  if (copy === undefined) {
    throw new Error("Mr. Tee could not be cloned");
  }
  return copy;
}

test("use_case_edit_buddy", async ({ account, page, testData }) => {
  const buddy = await cloneMrTee(testData);
  await logIn(page, account);
  await page.goto("/buddies");
  await page.getByRole("link", { exact: true, name: buddy.name }).click();
  await expect(page).toHaveURL(`/buddies/${buddy.id}`);

  await test.step("her buddy's own parts show, its mechanics parts hidden by default", async () => {
    await expect(partField(page, BUDDY_PARTS_COPY.voice.label)).toHaveValue(
      MR_TEE.voice,
    );
    await expectMechanicsHidden(page);
    await expect(page.getByText("search_manual: query")).toBeVisible();
    await expect(page.getByText("<project_memory>")).toBeVisible();
  });

  await test.step("her edits are saved", async () => {
    await fillWhenReady(
      page.getByRole("textbox", { name: BUDDY_COPY.nameLabel }),
      "Mr. Tee, edited",
    );
    await partField(page, BUDDY_PARTS_COPY.voice.label).fill(
      "Pity the fool\nwho skips the manual.",
    );
    await press(page, BUDDY_COPY.save);

    await expect(
      page.getByRole("heading", { level: 1, name: "Mr. Tee, edited" }),
    ).toBeVisible();
    await expect(partField(page, BUDDY_PARTS_COPY.voice.label)).toHaveValue(
      "Pity the fool\nwho skips the manual.",
    );
    const saved = await getUserBuddy(account.id, buddy.id);
    expect(saved?.parts).toEqual({
      ...MR_TEE,
      voice: "Pity the fool\nwho skips the manual.",
    });
  });

  await test.step("a voice that says {{name}} reaches her chat's prompt with her name", async () => {
    await expectNameInPrompt(page, account.id, buddy.id);
  });

  await test.step("her buddies list it by its new name", async () => {
    await page.goto("/buddies");
    await expect(namesIn(page, BUDDIES_COPY.ownHeading)).toHaveText([
      "Mr. Tee, edited",
    ]);
  });

  await test.step("with the mechanics switched on, they show, with a warning", async () => {
    await showMechanics(page);
    await page.goto(`/buddies/${buddy.id}`);
    await expectMechanicsShown(page);
  });
});

test("use_case_reset_buddy_part", async ({ account, page, testData }) => {
  const buddy = await cloneMrTee(testData);
  await updateBuddy(account.id, buddy.id, {
    parts: { ...MR_TEE, voice: "Edited voice", citation: "Edited citations" },
  });
  await logIn(page, account);
  await showMechanics(page);
  await page.goto(`/buddies/${buddy.id}`);
  const voice = partField(page, BUDDY_PARTS_COPY.voice.label);
  const citation = partField(page, BUDDY_PARTS_COPY.citation.label);
  await expect(voice).toHaveValue("Edited voice");

  await test.step("the voice goes back to Mr. Tee's", async () => {
    await press(page, BUDDY_COPY.resetLabel(BUDDY_PARTS_COPY.voice.label));

    await expect(voice).toHaveValue(MR_TEE.voice);
    await expect(citation).toHaveValue("Edited citations");
  });

  await test.step("a mechanics part goes back to every buddy's", async () => {
    await press(page, BUDDY_COPY.resetLabel(BUDDY_PARTS_COPY.citation.label));

    await expect(citation).toHaveValue(MR_TEE.citation);
    expect((await getUserBuddy(account.id, buddy.id))?.parts).toEqual(MR_TEE);
  });
});

test("use_case_customize_built_in_buddy", async ({ account, page }) => {
  const fjord = getBuddy("fjord-tines");
  await logIn(page, account);
  await page.goto("/buddies");
  await page.getByRole("link", { exact: true, name: fjord.name }).click();

  await test.step("a built-in buddy's parts are read-only", async () => {
    await expect(page).toHaveURL("/buddies/fjord-tines");
    const voice = partField(page, BUDDY_PARTS_COPY.voice.label);
    await expect(voice).toHaveValue(fjord.parts.voice);
    await expect(voice).not.toBeEditable();
    await expect(page.getByText("<project_memory>")).toBeVisible();
  });

  await test.step("customizing it opens a copy of her own", async () => {
    await press(page, BUDDIES_COPY.customize);

    await expect(page).toHaveURL(OWN_BUDDY_PAGE);
    await expect(
      page.getByRole("heading", { level: 1, name: `${fjord.name} (clone)` }),
    ).toBeVisible();
    await expect(partField(page, BUDDY_PARTS_COPY.voice.label)).toBeEditable();
    await expect(partField(page, BUDDY_PARTS_COPY.voice.label)).toHaveValue(
      fjord.parts.voice,
    );
  });
});
