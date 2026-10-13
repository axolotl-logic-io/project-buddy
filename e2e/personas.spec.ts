import { expect, type Locator, type Page } from "@playwright/test";
import { listPersonas } from "@/personas/index.ts";
import { PERSONAS_COPY } from "@/ui/copy/personas.ts";
import { test } from "./fixtures.ts";
import { logIn } from "./log-in.ts";
import { waitForHydrated } from "./page-helpers.ts";

const BUILT_IN_NAMES = listPersonas().map((persona) => persona.name);

// The names in one of the page's lists: the built-in personas or her own.
function namesIn(page: Page, heading: string): Locator {
  return page
    .getByRole("region", { name: heading })
    .getByRole("listitem")
    .locator(".card-title");
}

// Clones the persona of this name, once the page can take the click.
async function clone(page: Page, name: string): Promise<void> {
  const button = page.getByRole("button", {
    exact: true,
    name: PERSONAS_COPY.cloneLabel(name),
  });
  await waitForHydrated(button);
  await button.click();
}

// Her own account starts with no personas, whatever other tests make.
test("use_case_view_personas", async ({ account, page }) => {
  await logIn(page, account);
  await page.goto("/personas");

  await expect(
    page.getByRole("heading", { level: 1, name: PERSONAS_COPY.heading }),
  ).toBeVisible();
  await expect(namesIn(page, PERSONAS_COPY.builtInHeading)).toHaveText(
    BUILT_IN_NAMES,
  );
  await expect(
    page
      .getByRole("region", { name: PERSONAS_COPY.ownHeading })
      .getByText(PERSONAS_COPY.noOwn),
  ).toBeVisible();
  await Promise.all(
    BUILT_IN_NAMES.map((name) =>
      expect(
        page.getByRole("button", {
          exact: true,
          name: PERSONAS_COPY.cloneLabel(name),
        }),
      ).toBeVisible(),
    ),
  );
});

test("use_case_clone_persona", async ({ account, page }) => {
  await logIn(page, account);
  await page.goto("/personas");
  const own = namesIn(page, PERSONAS_COPY.ownHeading);

  await test.step("cloning a built-in persona adds its copy to hers", async () => {
    await clone(page, "Hippy");

    await expect(page).toHaveURL("/personas");
    await expect(own).toHaveText(["Hippy (copy)"]);
    await expect(namesIn(page, PERSONAS_COPY.builtInHeading)).toHaveText(
      BUILT_IN_NAMES,
    );
  });

  await test.step("cloning one of hers adds a copy of the copy", async () => {
    await clone(page, "Hippy (copy)");

    await expect(page).toHaveURL("/personas");
    await expect(own).toHaveText(["Hippy (copy)", "Hippy (copy) (copy)"]);
  });
});

// A signed-in page, by name, and its address in a project with one chat.
interface SignedInPage {
  readonly name: string;
  readonly address: (projectId: string, chatId: string) => string;
}

const SIGNED_IN_PAGES: readonly SignedInPage[] = [
  { name: "the projects list", address: (): string => "/projects" },
  {
    name: "a project",
    address: (projectId: string): string => `/projects/${projectId}`,
  },
  {
    name: "a project's memory",
    address: (projectId: string): string => `/projects/${projectId}/memory`,
  },
  {
    name: "the new-chat form",
    address: (projectId: string): string => `/chats/new?projectId=${projectId}`,
  },
  {
    name: "a chat",
    address: (_projectId: string, chatId: string): string => `/chats/${chatId}`,
  },
  { name: "the Settings page", address: (): string => "/settings" },
  { name: "the account page", address: (): string => "/account" },
  { name: "the personas page", address: (): string => "/personas" },
];

// She goes to her personas by the header's Personas link, from any
// signed-in page.
test.describe("use_case_view_personas", () => {
  for (const signedInPage of SIGNED_IN_PAGES) {
    test(`from the header on ${signedInPage.name}`, async ({
      page,
      testData,
    }) => {
      const project = await testData.project();
      const chat = await testData.chat(project);
      await logIn(page, testData.account);
      await page.goto(signedInPage.address(project.id, chat.id));

      await page
        .getByRole("banner")
        .getByRole("link", { name: PERSONAS_COPY.headerLink })
        .click();

      await expect(page).toHaveURL("/personas");
      await expect(
        page.getByRole("heading", { level: 1, name: PERSONAS_COPY.heading }),
      ).toBeVisible();
    });
  }
});
