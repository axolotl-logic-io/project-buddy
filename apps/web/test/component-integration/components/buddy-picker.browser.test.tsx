// The buddy picker in Chromium and WebKit, as the new-chat, standalone-chat
// and new-project forms show it. "use_case_standalone_chat" in
// use-cases/chats.md: the picker shows one buddy at a time, Hippy first;
// the previous and next bars step through the built-in buddies, then her
// own, and wrap round at either end; "Choose a buddy" puts the list of every
// buddy in the card's place, at the card's height, so nothing after the
// picker moves, and choosing one, by pointer or keyboard, puts the card back
// with that buddy; the form sends the shown buddy as buddyId, and a buddy
// restored after a failed start shows first.
import { describe, expect, test } from "vitest";
import { type Locator, page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import type { OwnBuddyChoice } from "@/buddies/buddy-store.ts";
import { type Buddy, getBuddy, listBuddies } from "@/buddies/index.ts";
import { BuddyPicker } from "@/components/buddy-picker.tsx";
import { NEW_CHAT_COPY } from "@/ui/copy/chat.ts";
import { userBuddyIdFixture } from "../../support/id-fixtures.ts";

const BUILT_IN: readonly Buddy[] = listBuddies();
const OWN: OwnBuddyChoice = { id: userBuddyIdFixture(), name: "Pip" };
const COUNT: number = BUILT_IN.length + 1;
const HIPPY = getBuddy("hippy");
const MR_TEE = getBuddy("mr-tee");

// The button the form shows after the picker, whose place shows whether
// the picker's height changed.
const AFTER_LABEL = "After";

// Renders the picker in a form, with her own buddy, and returns the form.
async function renderPicker(
  defaultBuddyId: Buddy["id"] | OwnBuddyChoice["id"] = HIPPY.id,
): Promise<HTMLFormElement> {
  const screen = await render(
    <form>
      <BuddyPicker defaultBuddyId={defaultBuddyId} userBuddies={[OWN]} />
      <button type="button">{AFTER_LABEL}</button>
    </form>,
  );
  const form = screen.container.querySelector("form");
  if (form === null) {
    throw new Error("The picker's form is missing");
  }
  return form;
}

// The buddy the form would send.
function sent(form: HTMLFormElement): FormDataEntryValue | null {
  return new FormData(form).get("buddyId");
}

// Where the button after the picker sits, in pixels from the page's top.
function afterTop(): number {
  const { top } = page
    .getByRole("button", { name: AFTER_LABEL })
    .element()
    .getBoundingClientRect();
  return top;
}

function chooseButton(): Locator {
  return page.getByRole("button", { name: NEW_CHAT_COPY.chooseBuddyButton });
}

describe("use_case_standalone_chat", () => {
  test("the bars step to the next and previous buddy and wrap round at either end", async () => {
    const form = await renderPicker();
    const next = page.getByRole("button", { name: NEW_CHAT_COPY.nextBuddy });
    const previous = page.getByRole("button", {
      name: NEW_CHAT_COPY.previousBuddy,
    });

    expect(sent(form)).toBe(HIPPY.id);
    await expect.element(page.getByText(HIPPY.description)).toBeVisible();
    await next.click();
    expect(sent(form)).toBe(MR_TEE.id);
    await expect.element(page.getByText(MR_TEE.description)).toBeVisible();

    await previous.click();
    await previous.click();
    expect(sent(form)).toBe(OWN.id);
    await expect
      .element(page.getByText(NEW_CHAT_COPY.buddyPosition(COUNT, COUNT)))
      .toBeVisible();

    await next.click();
    expect(sent(form)).toBe(HIPPY.id);
    await expect.element(page.getByRole("list")).not.toBeInTheDocument();
  });

  test("a buddy chosen from the list takes the card's place without moving anything", async () => {
    const form = await renderPicker();
    const top = afterTop();

    await chooseButton().click();
    await expect
      .element(page.getByRole("list", { name: NEW_CHAT_COPY.builtInBuddies }))
      .toBeVisible();
    expect(afterTop()).toBe(top);
    await expect
      .element(page.getByRole("button", { name: HIPPY.name }))
      .toHaveFocus();

    await page
      .getByRole("list", { name: NEW_CHAT_COPY.ownBuddies })
      .getByRole("button", { name: OWN.name })
      .click();
    await expect.element(page.getByRole("list")).not.toBeInTheDocument();
    expect(afterTop()).toBe(top);
    expect(sent(form)).toBe(OWN.id);
    await expect.element(chooseButton()).toHaveFocus();

    await page.getByRole("button", { name: NEW_CHAT_COPY.nextBuddy }).click();
    expect(sent(form)).toBe(HIPPY.id);
  });

  test("the keyboard alone chooses any buddy from the list, and Escape keeps the shown one", async () => {
    const form = await renderPicker();
    await chooseButton().click();

    await userEvent.keyboard("{ArrowUp}");
    await expect
      .element(page.getByRole("button", { name: OWN.name }))
      .toHaveFocus();
    await userEvent.keyboard("{Home}");
    await userEvent.keyboard("{ArrowDown}");
    await userEvent.keyboard("{Enter}");
    expect(sent(form)).toBe(MR_TEE.id);

    await chooseButton().click();
    await userEvent.keyboard("{End}");
    await userEvent.keyboard("{Escape}");
    await expect.element(page.getByRole("list")).not.toBeInTheDocument();
    expect(sent(form)).toBe(MR_TEE.id);
  });

  test("a buddy restored after a failed start shows first", async () => {
    const form = await renderPicker(OWN.id);

    expect(sent(form)).toBe(OWN.id);
    await expect
      .element(page.getByText(NEW_CHAT_COPY.ownBuddyDescription))
      .toBeVisible();
  });
});
