import { expect, type Locator, type Page } from "@playwright/test";
import {
  getPersona,
  listPersonas,
  type PersonaParts,
} from "@/personas/index.ts";
import {
  clonePersona,
  getUserPersona,
  type UserPersona,
  updatePersona,
} from "@/personas/persona-store.ts";
import {
  PERSONA_COPY,
  PERSONA_PARTS_COPY,
  PERSONAS_COPY,
} from "@/ui/copy/personas.ts";
import type { TestData } from "./fixtures.ts";
import { test } from "./fixtures.ts";
import { logIn } from "./log-in.ts";
import { fillWhenReady, waitForHydrated } from "./page-helpers.ts";

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

const MR_TEE: PersonaParts = getPersona("mr-tee").parts;

// A persona's page: its own address, a UUID's.
const OWN_PERSONA_PAGE = /\/personas\/[0-9a-f-]{36}$/u;

// Her clone of Mr. Tee, made straight in the store.
async function cloneMrTee(testData: TestData): Promise<UserPersona> {
  const copy = await clonePersona(testData.account.id, "mr-tee");
  if (copy === undefined) {
    throw new Error("Mr. Tee could not be cloned");
  }
  return copy;
}

// The field of the part with this label.
function partField(page: Page, label: string): Locator {
  return page.getByRole("textbox", { exact: true, name: label });
}

// Clicks the button, once the page can take the click.
async function press(page: Page, name: string): Promise<void> {
  const button = page.getByRole("button", { exact: true, name });
  await waitForHydrated(button);
  await button.click();
}

test("use_case_edit_persona", async ({ account, page, testData }) => {
  const persona = await cloneMrTee(testData);
  await logIn(page, account);
  await page.goto("/personas");
  await page.getByRole("link", { name: persona.name }).click();
  await expect(page).toHaveURL(`/personas/${persona.id}`);

  await test.step("every part shows, mechanics parts with a warning", async () => {
    await expect(partField(page, PERSONA_PARTS_COPY.voice.label)).toHaveValue(
      MR_TEE.voice,
    );
    await expect(
      partField(page, PERSONA_PARTS_COPY.citation.label),
    ).toHaveAccessibleDescription(
      new RegExp(PERSONA_COPY.mechanicsWarning, "u"),
    );
    await expect(page.getByText("search_manual: query")).toBeVisible();
    await expect(page.getByText("<project_memory>")).toBeVisible();
  });

  await test.step("her edits are saved", async () => {
    await fillWhenReady(
      page.getByRole("textbox", { name: PERSONA_COPY.nameLabel }),
      "Mr. Tee, edited",
    );
    await partField(page, PERSONA_PARTS_COPY.voice.label).fill(
      "Pity the fool\nwho skips the manual.",
    );
    await press(page, PERSONA_COPY.save);

    await expect(
      page.getByRole("heading", { level: 1, name: "Mr. Tee, edited" }),
    ).toBeVisible();
    await expect(partField(page, PERSONA_PARTS_COPY.voice.label)).toHaveValue(
      "Pity the fool\nwho skips the manual.",
    );
    const saved = await getUserPersona(account.id, persona.id);
    expect(saved?.parts).toEqual({
      ...MR_TEE,
      voice: "Pity the fool\nwho skips the manual.",
    });
  });

  await test.step("her personas list it by its new name", async () => {
    await page.goto("/personas");
    await expect(namesIn(page, PERSONAS_COPY.ownHeading)).toHaveText([
      "Mr. Tee, edited",
    ]);
  });
});

test("use_case_reset_persona_part", async ({ account, page, testData }) => {
  const persona = await cloneMrTee(testData);
  await updatePersona(account.id, persona.id, {
    parts: { ...MR_TEE, voice: "Edited voice", citation: "Edited citations" },
  });
  await logIn(page, account);
  await page.goto(`/personas/${persona.id}`);
  const voice = partField(page, PERSONA_PARTS_COPY.voice.label);
  const citation = partField(page, PERSONA_PARTS_COPY.citation.label);
  await expect(voice).toHaveValue("Edited voice");

  await test.step("the voice goes back to Mr. Tee's", async () => {
    await press(page, PERSONA_COPY.resetLabel(PERSONA_PARTS_COPY.voice.label));

    await expect(voice).toHaveValue(MR_TEE.voice);
    await expect(citation).toHaveValue("Edited citations");
  });

  await test.step("a mechanics part goes back to every persona's", async () => {
    await press(
      page,
      PERSONA_COPY.resetLabel(PERSONA_PARTS_COPY.citation.label),
    );

    await expect(citation).toHaveValue(MR_TEE.citation);
    expect((await getUserPersona(account.id, persona.id))?.parts).toEqual(
      MR_TEE,
    );
  });
});

test("use_case_edit_built_in_persona_clones", async ({ account, page }) => {
  const fjord = getPersona("fjord-tines");
  await logIn(page, account);
  await page.goto("/personas");
  await page.getByRole("link", { exact: true, name: fjord.name }).click();

  await test.step("a built-in persona's parts are read-only", async () => {
    await expect(page).toHaveURL("/personas/fjord-tines");
    const voice = partField(page, PERSONA_PARTS_COPY.voice.label);
    await expect(voice).toHaveValue(fjord.parts.voice);
    await expect(voice).not.toBeEditable();
    await expect(page.getByText("<project_memory>")).toBeVisible();
  });

  await test.step("editing it opens a copy of her own", async () => {
    await press(page, PERSONA_COPY.edit);

    await expect(page).toHaveURL(OWN_PERSONA_PAGE);
    await expect(
      page.getByRole("heading", { level: 1, name: `${fjord.name} (copy)` }),
    ).toBeVisible();
    await expect(
      partField(page, PERSONA_PARTS_COPY.voice.label),
    ).toBeEditable();
    await expect(partField(page, PERSONA_PARTS_COPY.voice.label)).toHaveValue(
      fjord.parts.voice,
    );
  });
});
