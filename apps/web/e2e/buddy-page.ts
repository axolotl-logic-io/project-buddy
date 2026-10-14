// A buddy's page (src/app/(workspace)/buddies/[buddyId]): its part
// fields, its buttons, and the Settings switch that shows its mechanics
// parts, which are off by default.
import { expect, type Locator, type Page } from "@playwright/test";
import { saveUserName } from "@/accounts/users-store.ts";
import { getUserBuddy } from "@/buddies/buddy-store.ts";
import { DEFAULT_BUDDY_ID } from "@/buddies/index.ts";
import { createChat } from "@/chats/new-chat-store.ts";
import type { UserId } from "@/ids.ts";
import { createProject } from "@/projects/store.ts";
import {
  BUDDIES_COPY,
  BUDDY_COPY,
  BUDDY_PARTS_COPY,
} from "@/ui/copy/buddies.ts";
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

// Customizes the built-in buddy of this name, from the list.
async function customize(page: Page, name: string): Promise<void> {
  await press(page, BUDDIES_COPY.customizeLabel(name));
}

// Clones the buddy of hers of this name, from the list.
async function clone(page: Page, name: string): Promise<void> {
  await press(page, BUDDIES_COPY.cloneLabel(name));
}

// Switches the buddy mechanics on in Settings, as they are off by default.
async function showMechanics(page: Page): Promise<void> {
  await switchExtra(page, FLAG_COPY.buddyMechanics.label, true, [
    // "persona-mechanics" and "interview-persona" are stored flag ids (cookie
    // and account data), kept through the buddy rename (#116).
    "interview-persona",
  ]);
}

// Expects the page to show the buddy's own parts, and to keep its
// citation part, a mechanics part, in the page but hidden.
async function expectMechanicsHidden(page: Page): Promise<void> {
  await expect(partField(page, BUDDY_PARTS_COPY.voice.label)).toBeVisible();
  await expect(partField(page, BUDDY_PARTS_COPY.role.label)).toBeVisible();
  const citation = page.getByRole("textbox", {
    exact: true,
    includeHidden: true,
    name: BUDDY_PARTS_COPY.citation.label,
  });
  await expect(citation).toHaveCount(1);
  await expect(citation).toBeHidden();
}

// Expects the page to show its citation part, a mechanics part, with the
// warning that an edit can break it.
async function expectMechanicsShown(page: Page): Promise<void> {
  const citation = partField(page, BUDDY_PARTS_COPY.citation.label);
  await expect(citation).toBeVisible();
  await expect(citation).toHaveAccessibleDescription(
    new RegExp(BUDDY_COPY.mechanicsWarning, "u"),
  );
}

// With her name set to Mabel, saves her buddy's voice as one that says
// {{name}}, on the buddy's page, which the page is on. Expects the voice's
// hint to say what {{name}} does, the page and the saved buddy to keep
// {{name}}, and a chat in the buddy to have her name in its prompt.
async function expectNameInPrompt(
  page: Page,
  owner: UserId,
  buddyId: string,
): Promise<void> {
  await saveUserName(owner, "Mabel");
  const voice = partField(page, BUDDY_PARTS_COPY.voice.label);
  await expect(voice).toHaveAccessibleDescription(MENTIONS_PLACEHOLDER);
  await fillWhenReady(voice, NAMED_VOICE);
  await press(page, BUDDY_COPY.save);
  await expect
    .poll(async () => (await getUserBuddy(owner, buddyId))?.parts.voice)
    .toBe(NAMED_VOICE);
  await page.reload();
  await expect(voice).toHaveValue(NAMED_VOICE);
  const saved = await getUserBuddy(owner, buddyId);
  if (saved === undefined) {
    throw new Error("Her buddy is gone");
  }
  const project = await createProject(owner, `Named ${crypto.randomUUID()}`);
  const chat = await createChat(owner, {
    projectId: project.id,
    buddy: { id: DEFAULT_BUDDY_ID, name: saved.name, parts: saved.parts },
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
