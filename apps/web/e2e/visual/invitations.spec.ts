import { expect, type Page } from "@playwright/test";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client.ts";
import { users } from "@/db/tables/users.ts";
import { INVITATIONS_COPY } from "@/ui/copy/invitations.ts";
import type { TestData } from "../fixtures.ts";
import { describeVisualPage } from "./visual-page.ts";

describeVisualPage({
  name: "invitations",
  signedIn: true,
  open: async (page: Page, testData: TestData): Promise<void> => {
    await getDb()
      .update(users)
      .set({ role: "admin" })
      .where(eq(users.id, testData.account.id));
    await page.goto("/invitations");
    await expect(
      page.getByRole("button", { name: INVITATIONS_COPY.send }),
    ).toBeVisible();
  },
});
