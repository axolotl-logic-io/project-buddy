// "use_case_hide_extras" in use-cases/appearance.md, for every flag in
// src/flags/flags.ts as it stands: switched off on Settings, an extra shows
// less of itself on a page that showed it, and a chat still shows what is
// never an extra, its citation of the manual and its composer. A new flag is
// checked here once e2e/extra-pages.ts has a page for it, which tsc demands.
import { expect, type Page } from "@playwright/test";
import {
  DEFAULT_HIDDEN_FLAGS,
  FLAGS,
  type FlagId,
  knownFlags,
} from "@/flags/flags.ts";
import type { Project } from "@/projects/store.ts";
import { CHAT_COPY } from "@/ui/copy/chat.ts";
import { FLAG_COPY } from "@/ui/copy/settings.ts";
import { citations, manualSection, sendMessage } from "./chat-page.ts";
import { EXTRA_PAGES, showExtraPage } from "./extra-pages.ts";
import { type TestData, test } from "./fixtures.ts";
import { switchExtra } from "./settings-page.ts";

// A word in no manual section but CITED_SECTION, so a search for it finds
// that section and the reply cites it.
const CITED_TOPIC = "quillwhorl";
const CITED_SECTION = manualSection(
  "modeling/meshes/editing/edge/quillwhorl",
  "quillwhorl-edges",
  "Quillwhorl Edges",
  "Press Ctrl-Alt-Q to quillwhorl the selected edges.",
);

// The page and test data a test of this case uses.
interface CaseArgs {
  readonly page: Page;
  readonly testData: TestData;
}

// Checks that a new chat in project, once the tutor has searched the manual,
// shows its citation and the composer.
async function expectCitationAndComposer(
  page: Page,
  testData: TestData,
  project: Project,
): Promise<void> {
  await testData.manualSections([CITED_SECTION]);
  const chat = await testData.chat(project);
  await page.goto(`/chats/${chat.id}`);
  await sendMessage(page, `/mock-search ${CITED_TOPIC}`);
  await expect(citations(page)).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: CHAT_COPY.messageLabel }),
  ).toBeVisible();
}

// The test of the extra id, whose switch is labelled label. Each test has a
// browser of its own, so the extra it switches off is on again for the next.
function switchOffOneExtra(
  id: FlagId,
  label: string,
): (args: CaseArgs) => Promise<void> {
  return async ({ page, testData }: CaseArgs): Promise<void> => {
    const extraPage = EXTRA_PAGES[id];
    const project = await testData.project();
    const address = await extraPage.make(page, testData, project);
    await showExtraPage(page, address, extraPage);
    const shown = await extraPage.onScreen(page, id);
    expect(shown, "parts on screen while it is on").toBeGreaterThan(0);

    await switchExtra(
      page,
      label,
      false,
      knownFlags([...DEFAULT_HIDDEN_FLAGS, id]),
    );
    await showExtraPage(page, address, extraPage);
    expect(
      await extraPage.onScreen(page, id),
      "parts on screen once it is off",
    ).toBeLessThan(shown);
    await expectCitationAndComposer(page, testData, project);
  };
}

test.describe("use_case_hide_extras", () => {
  for (const { id, copyKey } of FLAGS) {
    test.describe(`the ${id} switch`, () => {
      test(
        "switched off, it shows less of itself, and a chat keeps its citation and composer",
        switchOffOneExtra(id, FLAG_COPY[copyKey].label),
      );
    });
  }
});
