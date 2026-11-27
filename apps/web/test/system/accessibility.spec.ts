import AxeBuilder from "@axe-core/playwright";
import { expect, type Locator, type Page } from "@playwright/test";
import { saveUserName } from "@/accounts/users-store.ts";
import { changeRiteAvailability, OWN_RITE_ID } from "@/rites/rite-store.ts";
import { MODE_ATTRIBUTE, themeChoiceCookie } from "@/themes/theme-choice.ts";
import { DEFAULT_THEME_CHOICE, THEME_MODES } from "@/themes/themes.ts";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";
import { CREDITS_COPY } from "@/ui/copy/credits.ts";
import { GRIMOIRE_COPY } from "@/ui/copy/grimoire.ts";
import { HOME_COPY } from "@/ui/copy/home.ts";
import { LISTS_COPY } from "@/ui/copy/lists.ts";
import { LOGIN_COPY } from "@/ui/copy/login.ts";
import { QUEST_OVERVIEW_COPY } from "@/ui/copy/quest-overview.ts";
import { NEW_QUEST_COPY, QUEST_COPY, QUESTS_COPY } from "@/ui/copy/quests.ts";
import { QUICK_ADD_COPY } from "@/ui/copy/quick-add.ts";
import { SIGNUP_COPY } from "@/ui/copy/signup.ts";
import { SITE_COPY, SITE_PANEL_COPY } from "@/ui/copy/site.ts";
import { TIMER_COPY } from "@/ui/copy/timer.ts";
import { test } from "./fixtures.ts";
import { holdPageResponse } from "./hold-page-response.ts";
import { logIn } from "./log-in.ts";
import { fillWhenReady, waitForHydrated } from "./page-helpers.ts";

const VIEWPORTS = [
  { width: 1280, height: 720 },
  { width: 320, height: 720 },
];
const SIGNUP_REQUEST = /\/signup(?:\?|$)/u;
const TASKS_SECTION = /^Tasks/u;
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"];

async function audit(page: Page, state: string): Promise<void> {
  await test.step(`Audit: ${state}`, async () => {
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    const { violations } = await new AxeBuilder({ page })
      .withTags(AXE_TAGS)
      .analyze();
    const problems = violations.flatMap(({ id, nodes }) =>
      nodes.map(
        ({ target, html, failureSummary }) =>
          `${id}: ${JSON.stringify(target)}\n${html}\n${failureSummary ?? ""}`,
      ),
    );
    expect.soft(problems, `${page.url()} — ${state}`).toEqual([]);
  });
}

async function clickReady(button: Locator): Promise<void> {
  await waitForHydrated(button);
  await button.click();
}

async function openSitePanel(page: Page): Promise<Locator> {
  const panel = page.getByRole("dialog", { name: SITE_PANEL_COPY.title });
  await clickReady(page.getByRole("button", { name: SITE_PANEL_COPY.title }));
  await expect(panel).toBeVisible();
  await audit(page, "Site panel open");
  return panel;
}

test.describe("use_case_accessible_pages", () => {
  for (const mode of THEME_MODES) {
    for (const viewport of VIEWPORTS) {
      test.describe(`${mode} at ${viewport.width} px`, () => {
        test.use({ viewport });

        test.beforeEach(async ({ context, baseURL }) => {
          if (baseURL === undefined) {
            throw new Error("The appearance cookie needs the site's base URL");
          }
          const { name, value } = themeChoiceCookie({
            ...DEFAULT_THEME_CHOICE,
            mode,
          });
          await context.addCookies([{ name, value, url: baseURL }]);
        });

        test.afterEach(async ({ page }) => {
          await expect(page.locator("html")).toHaveAttribute(
            MODE_ATTRIBUTE,
            mode,
          );
        });

        for (const path of ["/login", "/signup"]) {
          test(`${path} and its email error`, async ({ page }) => {
            await page.goto(path);
            const email = page.getByRole("textbox", {
              name: LOGIN_COPY.emailLabel,
            });
            await expect(email).toBeVisible();
            await audit(page, "Email request");
            // The browser accepts this address. The site's validator requires
            // a domain suffix, so the form shows its own inline error.
            await fillWhenReady(email, "reader@example");
            await page.getByRole("button", { name: LOGIN_COPY.send }).click();
            await expect(page.getByText(LOGIN_COPY.needsEmail)).toBeVisible();
            await audit(page, "Invalid email");
          });
        }

        test("Sign-in page while sign-up is loading", async ({ page }) => {
          await holdPageResponse(
            page,
            SIGNUP_REQUEST,
            async ({ requested, release }) => {
              await page.goto("/login");
              const signUp = page.getByRole("link", {
                name: LOGIN_COPY.signUpLink,
              });
              await waitForHydrated(signUp);
              await signUp.click({ noWaitAfter: true });
              await requested;
              const band = page.getByRole("region", {
                name: SITE_COPY.breadcrumbs,
              });
              await expect(band).toHaveAttribute("aria-busy", "true");
              await expect(band.getByRole("status")).toHaveText(
                SITE_COPY.loading,
              );
              await audit(page, "Page change in progress");
              release();
              await expect(page.getByText(SIGNUP_COPY.intro)).toBeVisible();
              await expect(band).not.toHaveAttribute("aria-busy");
            },
          );
        });

        test("Credits", async ({ page }) => {
          await page.goto("/credits");
          await expect(
            page.getByRole("heading", { name: CREDITS_COPY.heading }),
          ).toBeVisible();
          await audit(page, "Credits");
          await openSitePanel(page);
        });

        test("Home", async ({ account, page, testData }) => {
          const quest = await testData.quest("Garden");
          await testData.task(quest, "Order seeds");
          await logIn(page, account);
          await expect(
            page.getByRole("heading", { name: HOME_COPY.heading, exact: true }),
          ).toBeVisible();
          await audit(page, "Home with an open task");
          const panel = await openSitePanel(page);
          await panel
            .getByRole("button", { name: QUICK_ADD_COPY.panelItem })
            .click();
          const quickAdd = page.getByRole("dialog", {
            name: QUICK_ADD_COPY.heading,
          });
          await expect(
            quickAdd.getByRole("textbox", { name: QUICK_ADD_COPY.textLabel }),
          ).toBeVisible();
          await audit(page, "Quick Add");
          await quickAdd
            .getByRole("button", { name: QUICK_ADD_COPY.save, exact: true })
            .click();
          await expect(
            quickAdd.getByText(QUICK_ADD_COPY.problem("empty")),
          ).toBeVisible();
          await audit(page, "Quick Add with empty text");
        });

        test("Quests and New quest", async ({ account, page, testData }) => {
          await testData.quest("Garden");
          await logIn(page, account);
          await page.goto("/quests");
          await expect(
            page.getByRole("link", { name: "Garden", exact: true }),
          ).toBeVisible();
          await audit(page, "Quests");
          await clickReady(
            page.getByRole("button", { name: NEW_QUEST_COPY.open }),
          );
          const dialog = page.getByRole("dialog", {
            name: NEW_QUEST_COPY.title,
          });
          await expect(dialog).toBeVisible();
          await audit(page, "New quest dialog");
          await dialog
            .getByRole("textbox", {
              name: NEW_QUEST_COPY.nameLabel,
              exact: true,
            })
            .fill(" ");
          await dialog
            .getByRole("button", { name: NEW_QUEST_COPY.start })
            .click();
          await expect(dialog.getByText(QUESTS_COPY.needsName)).toBeVisible();
          await audit(page, "New quest without a name");
        });

        test("Quest Overview and its controls", async ({
          account,
          page,
          testData,
        }) => {
          const quest = await testData.quest("Garden");
          await testData.task(quest, "Order seeds");
          await testData.rite("Morning pages");
          await logIn(page, account);
          await page.goto(`/quests/${quest.id}`);
          await expect(page.getByRole("list", { name: "Tasks" })).toBeVisible();
          await audit(page, "Quest Overview");

          const riteButton = page.getByRole("button", {
            name: QUEST_OVERVIEW_COPY.performRiteOn("Tasks"),
          });
          await clickReady(riteButton);
          const rite = page.getByRole("dialog", {
            name: QUEST_OVERVIEW_COPY.performRite,
          });
          await expect(rite).toBeVisible();
          await audit(page, "Perform a rite dialog");
          await rite
            .getByRole("button", { name: QUEST_OVERVIEW_COPY.rite.cancel })
            .click();
          await expect(rite).toBeHidden();

          const actions = page.getByRole("button", {
            name: LISTS_COPY.actions("task"),
          });
          await clickReady(actions);
          const menu = page.getByRole("menu");
          await expect(menu).toBeVisible();
          await audit(page, "Task actions menu");
          await menu
            .getByRole("menuitem", { name: LISTS_COPY.splitListItem("task") })
            .click();
          const split = page.getByRole("dialog", {
            name: LISTS_COPY.splitListItem("task"),
          });
          await expect(split).toBeVisible();
          await audit(page, "Split task dialog");
          await split
            .getByRole("button", { name: LISTS_COPY.split("task").cancel })
            .click();
          await expect(split).toBeHidden();

          await clickReady(
            page.getByRole("button", { name: LISTS_COPY.editListItem("task") }),
          );
          const editor = page.getByRole("group", {
            name: LISTS_COPY.editListItem("task"),
          });
          await expect(editor).toBeVisible();
          await audit(page, "Task edit form");
          await editor.getByRole("textbox").fill("");
          await editor
            .getByRole("button", { name: LISTS_COPY.saveEdit })
            .click();
          await expect(
            editor.getByText(LISTS_COPY.changeProblems["invalid-text"]),
          ).toBeVisible();
          await audit(page, "Task edit error");
          await editor
            .getByRole("button", { name: LISTS_COPY.cancelEdit })
            .click();
          await expect(editor).toBeHidden();

          const addLabel = QUEST_OVERVIEW_COPY.addTo("task", "Tasks");
          await clickReady(page.getByRole("button", { name: addLabel }));
          const add = page.getByRole("form", { name: addLabel });
          await expect(add).toBeVisible();
          await audit(page, "Task add form");
          await add
            .getByRole("button", { name: QUEST_OVERVIEW_COPY.adder.done })
            .click();
          await expect(add).toBeHidden();

          await clickReady(
            page.getByRole("button", { name: QUEST_COPY.rename }),
          );
          const rename = page.getByRole("dialog", {
            name: QUEST_COPY.titleLabel,
          });
          await expect(rename).toBeVisible();
          await audit(page, "Quest title editor");
          await rename
            .getByRole("textbox", { name: QUEST_COPY.titleLabel })
            .fill("");
          await rename
            .getByRole("button", { name: QUEST_COPY.saveTitle })
            .click();
          await expect(rename.getByText(QUESTS_COPY.needsName)).toBeVisible();
          await audit(page, "Quest title error");
          await rename
            .getByRole("button", { name: QUEST_COPY.cancelTitle })
            .click();
          await expect(rename).toBeHidden();

          const { expand, collapse } = QUEST_OVERVIEW_COPY.panel;
          const closeQuestPanel = page.getByRole("button", { name: collapse });
          if (!(await closeQuestPanel.isVisible())) {
            await clickReady(page.getByRole("button", { name: expand }));
          }
          await expect(closeQuestPanel).toBeVisible();
          await audit(page, "Quest panel open");
          await closeQuestPanel.click();
          await expect(closeQuestPanel).toBeHidden();

          await page
            .getByRole("region", { name: TASKS_SECTION })
            .getByRole("link", { name: TASKS_SECTION })
            .click();
          await clickReady(
            page.getByRole("button", { name: LISTS_COPY.settings }),
          );
          await expect(
            page.getByRole("form", { name: LISTS_COPY.settings }),
          ).toBeVisible();
          await audit(page, "List settings");
        });

        test("Grimoire", async ({ account, page, testData }) => {
          const rite = await testData.rite("Morning pages");
          await logIn(page, account);
          await page.goto("/grimoire");
          await expect(
            page.getByRole("link", { name: rite.name }),
          ).toBeVisible();
          await audit(page, "Grimoire");
          await page.getByRole("link", { name: GRIMOIRE_COPY.create }).click();
          const name = page.getByRole("textbox", { name: GRIMOIRE_COPY.name });
          await expect(name).toBeVisible();
          await audit(page, "New rite form");
        });

        test("Rite and its edit form", async ({ account, page, testData }) => {
          const rite = await testData.rite("Morning pages");
          await logIn(page, account);
          await page.goto(`/grimoire/${rite.id}`);
          const name = page.getByRole("textbox", { name: GRIMOIRE_COPY.name });
          await expect(name).toHaveValue(rite.name);
          await audit(page, "Own rite editor");
          await fillWhenReady(name, "");
          await page.getByRole("button", { name: GRIMOIRE_COPY.save }).click();
          await expect(page.getByText(GRIMOIRE_COPY.invalidName)).toBeVisible();
          await audit(page, "Rite name error");

          const forgotten = await testData.rite("Evening pages");
          expect(
            await changeRiteAvailability(
              account.id,
              OWN_RITE_ID.parse(forgotten.id),
              "forget",
            ),
          ).toBe(true);
          await page.goto(`/grimoire/${forgotten.id}`);
          await expect(
            page.getByText(GRIMOIRE_COPY.sources.forgotten, { exact: true }),
          ).toBeVisible();
          await audit(page, "Forgotten rite");
          await clickReady(
            page.getByRole("button", { name: GRIMOIRE_COPY.delete }),
          );
          await expect(
            page.getByRole("alertdialog", {
              name: GRIMOIRE_COPY.confirmDelete(forgotten.name),
            }),
          ).toBeVisible();
          await audit(page, "Delete forgotten rite confirmation");
        });

        test("Construct", async ({ account, page }) => {
          await logIn(page, account);
          await page.goto("/constructs/vellum");
          await expect(
            page.getByRole("heading", { name: "Vellum", level: 1 }),
          ).toBeVisible();
          await audit(page, "Construct");
        });

        test("Timer", async ({ account, page }) => {
          await logIn(page, account);
          await page.goto("/timer");
          const start = page.getByRole("button", {
            name: TIMER_COPY.start,
            exact: true,
          });
          await expect(start).toBeVisible();
          await audit(page, "Timer setup");
          await clickReady(start);
          await expect(
            page.getByRole("region", { name: TIMER_COPY.displayLabel }),
          ).toBeVisible();
          await audit(page, "Running timer");
          const preferences = page.getByRole("dialog", {
            name: TIMER_COPY.preferences,
          });
          await clickReady(
            page.getByRole("button", { name: TIMER_COPY.preferences }),
          );
          await expect(preferences).toBeVisible();
          await audit(page, "Timer preferences");
        });

        test("Profile and its name editor", async ({ account, page }) => {
          await saveUserName(account.id, "River");
          await logIn(page, account);
          await page.goto("/profile");
          const rename = page.getByRole("button", {
            name: ACCOUNT_COPY.rename,
          });
          await expect(rename).toBeVisible();
          await audit(page, "Profile");
          await clickReady(rename);
          const name = page.getByRole("textbox", {
            name: ACCOUNT_COPY.nameLabel,
          });
          await expect(name).toBeVisible();
          await audit(page, "Profile name editor");
          await name.fill("{name}");
          await page
            .getByRole("button", { name: ACCOUNT_COPY.saveName, exact: true })
            .click();
          await expect(page.getByText(ACCOUNT_COPY.nameBraces)).toBeVisible();
          await audit(page, "Profile name error");
        });

        test("Settings and the sign-out confirmation", async ({
          account,
          page,
        }) => {
          await logIn(page, account);
          await page.goto("/settings");
          const signOut = page.getByRole("button", {
            name: ACCOUNT_COPY.signOutEverywhere,
          });
          await expect(signOut).toBeVisible();
          await audit(page, "Settings");
          await clickReady(signOut);
          await expect(
            page.getByRole("alertdialog", {
              name: ACCOUNT_COPY.signOutEverywhereTitle,
            }),
          ).toBeVisible();
          await audit(page, "Sign out everywhere confirmation");
        });
      });
    }
  }
});
