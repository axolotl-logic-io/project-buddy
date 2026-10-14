// "use_case_new_project_with_persona" in use-cases/projects.md: with the
// interview persona extra switched on, the New Project form offers the
// built-in personas and then her own, and the project's interview chat is
// with the one she chose: one of her own here, cloned from Mr. Tee.
import { expect } from "@playwright/test";
import { clonePersona } from "@/personas/persona-store.ts";
import { CHAT_COPY } from "@/ui/copy/chat.ts";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";
import { FLAG_COPY } from "@/ui/copy/settings.ts";
import { chatMessages, personaName } from "./chat-page.ts";
import { test } from "./fixtures.ts";
import { logIn } from "./log-in.ts";
import { fillWhenReady, unique } from "./page-helpers.ts";
import { switchExtra } from "./settings-page.ts";

const CHAT_PATH = /\/chats\/[\da-f-]{36}$/u;

test("use_case_new_project_with_persona", async ({ account, page }) => {
  const own = await clonePersona(account.id, "mr-tee");
  if (own === undefined) {
    throw new Error("Mr. Tee could not be cloned");
  }
  await logIn(page, account);

  await test.step("in Settings, she switches the interview persona on", async () => {
    await switchExtra(page, FLAG_COPY.interviewPersona.label, true, [
      "persona-mechanics",
    ]);
  });

  await test.step("the form offers the built-in personas, then hers, with Hippy chosen", async () => {
    await page.goto("/projects");
    const group = page.getByRole("radiogroup", {
      name: PROJECTS_COPY.personaLabel,
    });
    await expect(group.getByRole("radio").last()).toHaveAccessibleName(
      own.name,
    );
    await expect(
      group.getByRole("radio", { name: personaName("hippy") }),
    ).toBeChecked();
  });

  await test.step("she names the project and chooses her persona", async () => {
    await fillWhenReady(
      page.getByRole("textbox", { name: PROJECTS_COPY.nameLabel }),
      unique("Persona project"),
    );
    await page.getByRole("radio", { name: own.name }).click();
    await page.getByRole("button", { name: PROJECTS_COPY.create }).click();
    await expect(page).toHaveURL(CHAT_PATH);
  });

  await test.step("the interview chat is with her persona, which opens it", async () => {
    await expect(
      page.getByRole("heading", { name: CHAT_COPY.heading(own.name) }),
    ).toBeVisible();
    await expect(chatMessages(page)).toHaveCount(1);
    const opening = chatMessages(page).first();
    await expect(opening.getByText(own.name, { exact: true })).toBeVisible();
    await expect(opening).toContainText("?");
  });
});
