// Reading and writing a project's memory page the way the user does: the
// current memory, the editor and the history.
import { expect, type Locator, type Page } from "@playwright/test";
import type { Project } from "@/projects/store.ts";
import { COPY } from "@/ui/copy.ts";

async function openMemory(page: Page, project: Project): Promise<void> {
  await page.goto(`/projects/${project.id}/memory`);
}

function currentMemory(page: Page): Locator {
  return page.getByRole("region", { name: COPY.memory.currentLabel });
}

function memoryField(page: Page): Locator {
  return page.getByRole("textbox", { name: COPY.memory.textLabel });
}

function historyEntries(page: Page): Locator {
  return page
    .getByRole("list", { name: COPY.memory.historyHeading })
    .getByRole("listitem");
}

// Checks the history lists one entry per item of entries, newest first, and
// that each shows its texts.
async function expectHistory(
  page: Page,
  entries: readonly (readonly string[])[],
): Promise<void> {
  await expect(historyEntries(page)).toHaveCount(entries.length);
  await Promise.all(
    entries.flatMap((texts, index) =>
      texts.map((text) =>
        expect(historyEntries(page).nth(index)).toContainText(text),
      ),
    ),
  );
}

export { currentMemory, expectHistory, memoryField, openMemory };
