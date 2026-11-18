import { page } from "vitest/browser";
import { QUEST_SIDEBAR_COPY } from "@/ui/copy/quest-sidebar.ts";

type Locator = ReturnType<typeof page.getByRole>;

function collectionTab(name: string = QUEST_SIDEBAR_COPY.buckets): Locator {
  return page.getByRole("tab", { name, exact: true });
}

function bucket(name: string): Locator {
  return page.getByRole("region", { name, exact: true });
}

async function openBucket(name: string): Promise<void> {
  await collectionTab(QUEST_SIDEBAR_COPY.buckets).click();
  await page.getByRole("menuitemradio", { name, exact: true }).click();
}

async function openAction(name: string): Promise<void> {
  await collectionTab(QUEST_SIDEBAR_COPY.actions).click();
  await page.getByRole("menuitemradio", { name, exact: true }).click();
}

export { bucket, collectionTab, openAction, openBucket };
