// Connecting Zotero and importing a collection, through the built site and
// the run's fake Zotero (test/support/zotero/fake-zotero.ts), whose origin
// playwright.config.ts copies into ZOTERO_API_ORIGIN. The server tests
// (test/component-integration/zotero/zotero-lists.server.test.ts) cover
// each case's rules; this test covers the OAuth round trip through the
// browser and the pages it lands on.
import { expect } from "@playwright/test";
import { readZoteroOrigins } from "@/env.ts";
import { ZOTERO_COPY } from "@/ui/copy/zotero.ts";
import {
  addZoteroCollection,
  addZoteroItem,
  addZoteroUser,
} from "../support/zotero/fake-zotero-kit.ts";
import { test } from "./fixtures.ts";
import { logIn } from "./log-in.ts";

// Where the fake Zotero listens (test/support/zotero/fake-zotero.ts).
const FAKE_ZOTERO_HOST = "http://127.0.0.1:";

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
    await addZoteroItem(origin, zoteroUserId, {
      collections: [reading],
      bib: "Austen, Jane. <i>Emma</i>. Penguin, 2003.",
    });
    const quest = await testData.quest("Thesis");
    await logIn(page, account);

    await test.step("declining in Zotero returns to setup to try again", async () => {
      await page.goto(`/quests/${quest.id}`);
      await page.getByRole("link", { name: ZOTERO_COPY.addCollection }).click();
      await page
        .getByRole("button", { name: ZOTERO_COPY.setup.connect })
        .click();
      await page.getByRole("button", { name: "Deny" }).click();
      await expect(
        page.getByText(ZOTERO_COPY.setup.connectFailed),
      ).toBeVisible();
    });

    await test.step("approving in Zotero shows the account's collections", async () => {
      await page
        .getByRole("button", { name: ZOTERO_COPY.setup.connect })
        .click();
      await page.getByLabel("Username").fill(username);
      await page.getByRole("button", { name: "Accept" }).click();
      await expect(
        page.getByText(ZOTERO_COPY.setup.connectedNow),
      ).toBeVisible();
      await expect(
        page.getByText(ZOTERO_COPY.setup.connected(username)),
      ).toBeVisible();
    });

    await test.step("Create and sync opens the new list with its entries", async () => {
      await page.getByRole("radio", { name: "Reading" }).check();
      await page
        .getByRole("button", { name: ZOTERO_COPY.setup.create })
        .click();
      await expect(
        page.getByRole("heading", { level: 2, name: "Reading" }),
      ).toBeVisible();
      const references = page.getByRole("list", { name: "Reading" });
      await expect(references.getByRole("listitem")).toHaveText([
        "Austen, Jane. Emma. Penguin, 2003.Open in Zotero",
      ]);
      await expect(references.locator("i")).toHaveText("Emma");
      await expect(
        page.getByRole("button", { name: ZOTERO_COPY.list.sync }),
      ).toBeVisible();
    });
  });
});
