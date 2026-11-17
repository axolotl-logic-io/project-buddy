// For the quest sidebar's browser tests: its Buckets tab, the menu that tab
// opens, and a bucket chosen from it the way the user would.

import { page } from "vitest/browser";
import { QUEST_SIDEBAR_COPY } from "@/ui/copy/quest-sidebar.ts";

type Locator = ReturnType<typeof page.getByRole>;

// The sidebar's Buckets tab, which opens the menu of buckets.
function bucketsTab(): Locator {
  return page.getByRole("tab", {
    name: QUEST_SIDEBAR_COPY.buckets,
    exact: true,
  });
}

// A bucket, by name, in the open Buckets menu.
function bucketItem(name: string): Locator {
  return page.getByRole("menuitemradio", { name, exact: true });
}

// The bucket shown under the Buckets tab, a region named by its heading.
function bucket(name: string): Locator {
  return page.getByRole("region", { name, exact: true });
}

// Opens the Buckets menu and chooses the bucket called name.
async function openBucket(name: string): Promise<void> {
  await bucketsTab().click();
  await bucketItem(name).click();
}

export { bucket, bucketItem, bucketsTab, openBucket };
