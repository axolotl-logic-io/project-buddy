// A Zotero Collection list's page in the browser, as use-cases/zotero.md
// describes it: read-only Works Cited entries with their italics, a search,
// shared checkmarks that wait for the owner's Sync, and why the collection
// can't be reached. What each mark and sync saves is the server tests'
// (test/component-integration/zotero/zotero-lists.server.test.ts).

import { afterEach, describe, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { ZoteroListPage } from "@/components/zotero/zotero-list-page.tsx";
import { LIST_ID } from "@/lists/list.ts";
import { ZOTERO_COPY } from "@/ui/copy/zotero.ts";
import { plainText } from "@/zotero/works-cited.ts";
import { ZOTERO_REFERENCE_ID } from "@/zotero/zotero.ts";
import {
  markZoteroReferenceAction,
  syncZoteroListAction,
} from "@/zotero/zotero-actions.ts";
import type {
  ZoteroList,
  ZoteroReference,
} from "@/zotero/zotero-list-store.ts";
import { questIdFixture } from "../../support/id-fixtures.ts";

const COPY: typeof ZOTERO_COPY.list = ZOTERO_COPY.list;
const QUEST_ID = questIdFixture();
const LIST = LIST_ID.parse(crypto.randomUUID());

function reference(
  author: string,
  title: string,
  more: Partial<ZoteroReference> = {},
): ZoteroReference {
  return {
    id: ZOTERO_REFERENCE_ID.parse(crypto.randomUUID()),
    entry: [
      { text: `${author}. `, italic: false },
      { text: title, italic: true },
      { text: ". Example Press, 2020.", italic: false },
    ],
    href: `https://www.zotero.org/reader/items/${title.length}`,
    checked: false,
    pending: undefined,
    ...more,
  };
}

// Austen is checked in Zotero; Baldwin waits to be checked.
const AUSTEN = reference("Austen, Jane", "Emma", { checked: true });
const BALDWIN = reference("Baldwin, James", "Giovanni's Room", {
  pending: true,
});

function zoteroList(more: Partial<ZoteroList> = {}): ZoteroList {
  return {
    list: {
      id: LIST,
      name: "Reading",
      type: "zotero-collection",
      position: 2,
      version: 1,
    },
    collectionName: "Reading",
    checkmarkTag: "read",
    markable: true,
    checkmarksShown: true,
    syncedAt: new Date("2026-11-20T09:00:00Z"),
    unavailable: undefined,
    lastSync: {
      kind: "synced",
      at: "2026-11-20T09:00:00Z",
      sent: 0,
      skipped: [],
      waiting: 0,
    },
    references: [AUSTEN, BALDWIN],
    pending: 1,
    ...more,
  };
}

async function renderPage(zotero: ZoteroList, owner: boolean): Promise<void> {
  await render(
    <ZoteroListPage
      questId={QUEST_ID}
      quest="Thesis"
      back={`/quests/${QUEST_ID}`}
      zotero={zotero}
      owner={owner}
    />,
  );
}

function checkmark(of: ZoteroReference): ReturnType<typeof page.getByRole> {
  return page.getByRole("checkbox", { name: COPY.check(plainText(of.entry)) });
}

afterEach(() => {
  vi.mocked(markZoteroReferenceAction).mockReset();
  vi.mocked(syncZoteroListAction).mockReset();
});

describe("Zotero Collection list page", () => {
  test("shows the entries with their italics, a link to each in Zotero, and a search", async () => {
    await renderPage(zoteroList(), true);
    const references = page.getByRole("list", { name: "Reading" });
    await expect.element(references.getByRole("listitem")).toHaveLength(2);
    await expect
      .element(references.getByText("Emma", { exact: true }))
      .toHaveProperty("tagName", "I");
    await expect
      .element(
        page.getByRole("link", {
          name: COPY.openInZoteroFor(plainText(AUSTEN.entry)),
        }),
      )
      .toHaveAttribute("href", AUSTEN.href);
    await expect.element(page.getByText(COPY.count(2))).toBeVisible();

    await userEvent.fill(page.getByRole("searchbox"), "giovanni");
    await expect.element(references.getByRole("listitem")).toHaveLength(1);
    await userEvent.fill(page.getByRole("searchbox"), "Beloved");
    await expect.element(page.getByText(COPY.noMatch("Beloved"))).toBeVisible();
  });

  test("the owner syncs from the page, which counts the waiting changes", async () => {
    vi.mocked(syncZoteroListAction).mockResolvedValue({
      ok: false,
      message: ZOTERO_COPY.problems["zotero-unavailable"],
    });
    await renderPage(zoteroList(), true);
    await expect.element(page.getByText(COPY.pending(1))).toBeVisible();
    await expect.element(page.getByText(COPY.waiting)).toBeVisible();

    await userEvent.click(page.getByRole("button", { name: COPY.sync }));
    expect(syncZoteroListAction).toHaveBeenCalledWith(QUEST_ID, LIST);
    await expect
      .element(page.getByText(ZOTERO_COPY.problems["zotero-unavailable"]))
      .toBeVisible();
  });

  test("a quest member marks a reference but can't sync or change settings", async () => {
    vi.mocked(markZoteroReferenceAction).mockResolvedValue({ ok: true });
    await renderPage(zoteroList(), false);
    await expect
      .element(page.getByRole("button", { name: COPY.sync }))
      .not.toBeInTheDocument();
    await expect
      .element(page.getByRole("button", { name: "List settings" }))
      .not.toBeInTheDocument();
    await expect.element(checkmark(AUSTEN)).toBeChecked();
    await expect.element(checkmark(BALDWIN)).toBeChecked();

    await userEvent.click(checkmark(AUSTEN));
    expect(markZoteroReferenceAction).toHaveBeenCalledWith(
      QUEST_ID,
      LIST,
      AUSTEN.id,
      false,
    );
  });

  test("a failed mark shows why", async () => {
    vi.mocked(markZoteroReferenceAction).mockResolvedValue({
      ok: false,
      message: ZOTERO_COPY.list.marksClosed,
    });
    await renderPage(zoteroList(), false);
    await userEvent.click(checkmark(AUSTEN));
    await expect
      .element(page.getByRole("alert"))
      .toHaveTextContent(ZOTERO_COPY.list.marksClosed);
  });

  test("while access has ended, checkmarks show but can't change, and the owner can connect again", async () => {
    await renderPage(
      zoteroList({ markable: false, unavailable: "access-ended" }),
      true,
    );
    await expect
      .element(
        page.getByText(ZOTERO_COPY.unavailable["access-ended"], {
          exact: false,
        }),
      )
      .toBeVisible();
    await expect.element(checkmark(AUSTEN)).toBeDisabled();
    await expect.element(checkmark(BALDWIN)).toBeChecked();
    await expect
      .element(page.getByRole("button", { name: ZOTERO_COPY.setup.connect }))
      .toBeVisible();
    await expect.element(page.getByRole("searchbox")).toBeEnabled();
  });

  test("after a new checkmark tag, checkmarks wait for a sync", async () => {
    await renderPage(
      zoteroList({ markable: false, checkmarksShown: false, pending: 0 }),
      true,
    );
    await expect.element(page.getByText(COPY.newTag)).toBeVisible();
    await expect.element(page.getByRole("checkbox")).not.toBeInTheDocument();
  });

  test("a failed sync says what Zotero confirmed and what still waits", async () => {
    await renderPage(
      zoteroList({
        lastSync: {
          kind: "failed",
          at: "2026-11-20T09:05:00Z",
          problem: "zotero-unavailable",
          sent: 1,
          skipped: [],
          waiting: 1,
        },
      }),
      true,
    );
    await expect
      .element(page.getByRole("status").filter({ hasText: "failed" }))
      .toHaveTextContent(
        `${COPY.failed({ sent: 1, waiting: 1 })} ${ZOTERO_COPY.problems["zotero-unavailable"]}`,
      );
  });
});
