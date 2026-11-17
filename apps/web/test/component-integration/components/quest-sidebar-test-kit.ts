import { page } from "vitest/browser";

type Locator = ReturnType<typeof page.getByRole>;

function collectionTab(name = "Tasks"): Locator {
  return page.getByRole("tab", { name, exact: true });
}

function bucket(name: string): Locator {
  return page.getByRole("region", { name, exact: true });
}

async function openBucket(name: string): Promise<void> {
  await collectionTab(name).click();
}

export { bucket, collectionTab, openBucket };
