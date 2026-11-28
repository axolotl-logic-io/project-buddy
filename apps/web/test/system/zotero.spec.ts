// Connecting Zotero and importing a collection, through the built site and
// the run's fake Zotero (test/support/zotero/fake-zotero.ts), whose origin
// playwright.config.ts copies into ZOTERO_API_ORIGIN. The server tests
// (test/component-integration/zotero/zotero-lists.server.test.ts) cover
// each case's rules; this test covers the OAuth round trip through the
// browser and the pages it lands on.
import { expect } from "@playwright/test";
import { readZoteroOrigins } from "@/env.ts";
import { LISTS_COPY } from "@/ui/copy/lists.ts";
import { QUEST_OVERVIEW_COPY } from "@/ui/copy/quest-overview.ts";
import { ZOTERO_COPY } from "@/ui/copy/zotero.ts";
import {
  addZoteroCollection,
  addZoteroItem,
  addZoteroUser,
  zoteroNoteWrites,
} from "../support/zotero/fake-zotero-kit.ts";
import { test } from "./fixtures.ts";
import { logIn } from "./log-in.ts";

// Where the fake Zotero listens (test/support/zotero/fake-zotero.ts).
const FAKE_ZOTERO_HOST = "http://127.0.0.1:";
// The Reading collection's choice, named for it and then its count.
const READING = /^Reading/u;

test.describe("use_case_create_zotero_collection_list", () => {
  test("connect Zotero, then Create and sync a collection as a list", async ({
    account,
    page,
    testData,
  }) => {
    const origin = readZoteroOrigins().api;
    // Seeding goes to the fake alone, never to zotero.org.
    if (!origin.startsWith(FAKE_ZOTERO_HOST)) {
      throw new Error(`The fake Zotero didn't start; Zotero is at ${origin}`);
    }
    const username = `reader-${crypto.randomUUID()}`;
    const zoteroUserId = await addZoteroUser(origin, username);
    const reading = await addZoteroCollection(origin, zoteroUserId, "Reading");
    const emma = await addZoteroItem(origin, zoteroUserId, {
      collections: [reading],
      bib: "Austen, Jane. <i>Emma</i>. Penguin, 2003.",
    });
    const quest = await testData.quest("Thesis");
    await logIn(page, account);

    // The dialog's second step, named for a Zotero Collection list.
    const setup = page.getByRole("dialog", {
      name: QUEST_OVERVIEW_COPY.newList.titleOf("zotero-collection"),
    });

    await test.step("declining in Zotero returns to the New list dialog to try again", async () => {
      await page.goto(`/quests/${quest.id}`);
      await page
        .getByRole("button", { name: QUEST_OVERVIEW_COPY.addBox.newList })
        .click();
      const kinds = page.getByRole("dialog", {
        name: QUEST_OVERVIEW_COPY.newList.title,
      });
      await kinds
        .getByRole("radio", { name: LISTS_COPY.types["zotero-collection"] })
        .check();
      await kinds
        .getByRole("button", { name: QUEST_OVERVIEW_COPY.newList.next })
        .click();
      await setup
        .getByRole("button", { name: ZOTERO_COPY.setup.connect })
        .click();
      await page.getByRole("button", { name: "Deny" }).click();
      await expect(
        setup.getByText(ZOTERO_COPY.setup.connectFailed),
      ).toBeVisible();
    });

    await test.step("approving in Zotero shows the account's collections", async () => {
      await page
        .getByRole("button", { name: ZOTERO_COPY.setup.connect })
        .click();
      await page.getByLabel("Username").fill(username);
      await page.getByRole("button", { name: "Accept" }).click();
      await expect(
        setup.getByText(ZOTERO_COPY.setup.connectedNow),
      ).toBeAttached();
      await expect(
        setup.getByText(ZOTERO_COPY.setup.connected(username)),
      ).toBeAttached();
      await expect(
        setup.getByText(ZOTERO_COPY.setup.steps.connectedAs(username), {
          exact: true,
        }),
      ).toBeVisible();
    });

    await test.step("Create and sync opens the new list with its entries", async () => {
      await setup.getByRole("radio", { name: READING }).check();
      await page
        .getByRole("button", { name: ZOTERO_COPY.setup.create })
        .click();
      await expect(
        page.getByRole("heading", { level: 2, name: "Reading" }),
      ).toBeVisible();
      const references = page.getByRole("list", { name: "Reading" });
      await expect(references.getByRole("listitem")).toHaveText([
        "Austen, Jane. Emma. Penguin, 2003.Open in ZoteroAdd a note",
      ]);
      await expect(references.locator("i")).toHaveText("Emma");
      await expect(
        page.getByRole("button", { name: ZOTERO_COPY.list.sync }),
      ).toBeVisible();
    });

    await test.step("a note written here waits for Sync, then goes to Zotero", async () => {
      const entry = "Austen, Jane. Emma. Penguin, 2003.";
      await page
        .getByRole("button", { name: ZOTERO_COPY.notes.addFor(entry) })
        .click();
      await page
        .getByRole("textbox", { name: ZOTERO_COPY.notes.field(entry) })
        .fill("Box Hill & the picnic.");
      await page.getByRole("button", { name: ZOTERO_COPY.notes.save }).click();
      await expect(page.getByText(ZOTERO_COPY.notes.waiting)).toBeVisible();
      await expect(
        page.getByText(ZOTERO_COPY.list.pending({ marks: 0, notes: 1 })),
      ).toBeVisible();
      await page.getByRole("button", { name: ZOTERO_COPY.list.sync }).click();
      await expect(
        page.getByText(ZOTERO_COPY.notes.inZotero, { exact: true }),
      ).toBeVisible();
      expect(await zoteroNoteWrites(origin, zoteroUserId)).toEqual([
        {
          noteKey: expect.any(String),
          parentItem: emma,
          note: "<p>Box Hill &amp; the picnic.</p>",
        },
      ]);
    });
  });
});
