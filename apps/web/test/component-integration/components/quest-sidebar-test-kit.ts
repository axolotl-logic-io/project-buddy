import { page } from "vitest/browser";

type Locator = ReturnType<typeof page.getByRole>;

function collectionTab(name = "Buckets"): Locator {
  return page.getByRole("tab", { name, exact: true });
}

function bucket(name: string): Locator {
  return page.getByRole("region", { name, exact: true });
}

async function openBucket(name: string): Promise<void> {
  await collectionTab("Buckets").click();
  await page.getByRole("menuitemradio", { name, exact: true }).click();
}

async function openAction(name: string): Promise<void> {
  await collectionTab("Actions").click();
  await page.getByRole("menuitemradio", { name, exact: true }).click();
}

export { bucket, collectionTab, openAction, openBucket };
