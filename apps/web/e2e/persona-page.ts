// A persona's page (src/app/(workspace)/personas/[personaId]): its part
// fields, its buttons, and the Settings switch that shows its mechanics
// parts, which are off by default.
import { expect, type Locator, type Page } from "@playwright/test";
import { saveUserName } from "@/accounts/users-store.ts";
import { createChat } from "@/chats/new-chat-store.ts";
import type { UserId } from "@/ids.ts";
import { DEFAULT_PERSONA_ID } from "@/personas/index.ts";
import { getUserPersona } from "@/personas/persona-store.ts";
import { createProject } from "@/projects/store.ts";
import {
  PERSONA_COPY,
  PERSONA_PARTS_COPY,
  PERSONAS_COPY,
} from "@/ui/copy/personas.ts";
import { FLAG_COPY } from "@/ui/copy/settings.ts";
import { tutorPrompt } from "./chat-page.ts";
import { fillWhenReady, waitForHydrated } from "./page-helpers.ts";
import { switchExtra } from "./settings-page.ts";

const NAMED_VOICE = "Hi {{name}}, fool.";
const MENTIONS_PLACEHOLDER = /\{\{name\}\}/u;

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

// Customizes the built-in persona of this name, from the list.
async function customize(page: Page, name: string): Promise<void> {
  await press(page, PERSONAS_COPY.customizeLabel(name));
}

// Clones the persona of hers of this name, from the list.
async function clone(page: Page, name: string): Promise<void> {
  await press(page, PERSONAS_COPY.cloneLabel(name));
}

// Switches the persona mechanics on in Settings, as they are off by default.
async function showMechanics(page: Page): Promise<void> {
  await switchExtra(page, FLAG_COPY.personaMechanics.label, true, [
    "interview-persona",
  ]);
}

// Expects the page to show the persona's own parts, and to keep its
// citation part, a mechanics part, in the page but hidden.
async function expectMechanicsHidden(page: Page): Promise<void> {
  await expect(partField(page, PERSONA_PARTS_COPY.voice.label)).toBeVisible();
  await expect(partField(page, PERSONA_PARTS_COPY.role.label)).toBeVisible();
  const citation = page.getByRole("textbox", {
    exact: true,
    includeHidden: true,
    name: PERSONA_PARTS_COPY.citation.label,
  });
  await expect(citation).toHaveCount(1);
  await expect(citation).toBeHidden();
}

// Expects the page to show its citation part, a mechanics part, with the
// warning that an edit can break it.
async function expectMechanicsShown(page: Page): Promise<void> {
  const citation = partField(page, PERSONA_PARTS_COPY.citation.label);
  await expect(citation).toBeVisible();
  await expect(citation).toHaveAccessibleDescription(
    new RegExp(PERSONA_COPY.mechanicsWarning, "u"),
  );
}

// With her name set to Mabel, saves her persona's voice as one that says
// {{name}}, on the persona's page, which the page is on. Expects the voice's
// hint to say what {{name}} does, the page and the saved persona to keep
// {{name}}, and a chat in the persona to have her name in its prompt.
async function expectNameInPrompt(
  page: Page,
  owner: UserId,
  personaId: string,
): Promise<void> {
  await saveUserName(owner, "Mabel");
  const voice = partField(page, PERSONA_PARTS_COPY.voice.label);
  await expect(voice).toHaveAccessibleDescription(MENTIONS_PLACEHOLDER);
  await fillWhenReady(voice, NAMED_VOICE);
  await press(page, PERSONA_COPY.save);
  await expect
    .poll(async () => (await getUserPersona(owner, personaId))?.parts.voice)
    .toBe(NAMED_VOICE);
  await page.reload();
  await expect(voice).toHaveValue(NAMED_VOICE);
  const saved = await getUserPersona(owner, personaId);
  if (saved === undefined) {
    throw new Error("Her persona is gone");
  }
  const project = await createProject(owner, `Named ${crypto.randomUUID()}`);
  const chat = await createChat(owner, {
    projectId: project.id,
    persona: { id: DEFAULT_PERSONA_ID, name: saved.name, parts: saved.parts },
  });
  await page.goto(`/chats/${chat.id}`);
  const prompt = await tutorPrompt(page);
  await expect(prompt).toContainText("Hi Mabel, fool.");
  await expect(prompt).not.toContainText("{{name}}");
}

export {
  clone,
  customize,
  expectMechanicsHidden,
  expectMechanicsShown,
  expectNameInPrompt,
  partField,
  press,
  showMechanics,
};
