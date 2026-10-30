import { expect, type Locator, type Page } from "@playwright/test";
import { sendInvitation } from "@/accounts/invitations.ts";
import { readEndToEndPort } from "@/env.ts";
import { SETUP_COPY } from "@/ui/copy/invitations.ts";
import {
  cleanInvitations,
  newRecipient,
} from "../../support/accounts/invitations-test-kit.ts";
import { test } from "../fixtures.ts";
import { setupLinkIn, waitForEmailsTo } from "../outbox.ts";
import { describeVisualPage } from "./visual-page.ts";

const INVITED_EMAIL = /server-[\da-f-]+@example\.test/u;

test.afterEach(cleanInvitations);

describeVisualPage({
  name: "setup",
  signedIn: false,
  open: async (page: Page): Promise<void> => {
    const email = await newRecipient();
    await sendInvitation(
      email,
      new Headers({ origin: `http://localhost:${readEndToEndPort()}` }),
    );
    const [message] = await waitForEmailsTo(email, 1);
    await page.goto(setupLinkIn(message));
    await expect(
      page.getByRole("button", { name: SETUP_COPY.confirm }),
    ).toBeVisible();
  },
  changing: (page: Page): readonly Locator[] => [page.getByText(INVITED_EMAIL)],
});

describeVisualPage({
  name: "setup-unusable",
  signedIn: false,
  open: async (page: Page): Promise<void> => {
    await page.goto("/setup");
    await expect(page.getByText(SETUP_COPY.unusable)).toBeVisible();
  },
});
