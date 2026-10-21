import { expect, type Page } from "@playwright/test";
import { INVITATIONS_COPY } from "@/ui/copy/invitations.ts";
import { promoteToAdmin } from "../../test/test-database/user-test-kit.ts";
import type { TestData } from "../fixtures.ts";
import { describeVisualPage } from "./visual-page.ts";

describeVisualPage({
  name: "invitations",
  signedIn: true,
  open: async (page: Page, testData: TestData): Promise<void> => {
    await promoteToAdmin(testData.account);
    await page.goto("/invitations");
    await expect(
      page.getByRole("button", { name: INVITATIONS_COPY.send }),
    ).toBeVisible();
  },
});
