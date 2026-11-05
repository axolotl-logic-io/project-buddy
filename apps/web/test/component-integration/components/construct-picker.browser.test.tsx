// The construct picker in Chromium and WebKit, as the new-chat, standalone-chat
// and new-project forms show it. "use_case_standalone_chat" in
// use-cases/chats.md: the picker shows one construct at a time, Hippy first;
// the previous and next bars step through the built-in constructs, then her
// own, and wrap round at either end; "Choose a construct" puts the list of every
// construct in the card's place, at the card's height, so nothing after the
// picker moves, and choosing one, by pointer or keyboard, puts the card back
// with that construct; the form sends the shown construct as constructId, and a construct
// restored after a failed start shows first.
import { describe, expect, test } from "vitest";
import { type Locator, page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { ConstructPicker } from "@/components/construct-picker.tsx";
import type { OwnConstructChoice } from "@/constructs/construct-store.ts";
import {
  type Construct,
  getConstruct,
  listConstructs,
} from "@/constructs/index.ts";
import { NEW_CHAT_COPY } from "@/ui/copy/chat.ts";
import { userConstructIdFixture } from "../../support/id-fixtures.ts";

const BUILT_IN: readonly Construct[] = listConstructs();
const OWN: OwnConstructChoice = { id: userConstructIdFixture(), name: "Pip" };
const COUNT: number = BUILT_IN.length + 1;
const HIPPY = getConstruct("hippy");
const MR_TEE = getConstruct("mr-tee");

// The button the form shows after the picker, whose place shows whether
// the picker's height changed.
const AFTER_LABEL = "After";

// Renders the picker in a form, with her own construct, and returns the form.
async function renderPicker(
  defaultConstructId: Construct["id"] | OwnConstructChoice["id"] = HIPPY.id,
): Promise<HTMLFormElement> {
  const screen = await render(
    <form>
      <ConstructPicker
        defaultConstructId={defaultConstructId}
        userConstructs={[OWN]}
      />
      <button type="button">{AFTER_LABEL}</button>
    </form>,
  );
  const form = screen.container.querySelector("form");
  if (form === null) {
    throw new Error("The picker's form is missing");
  }
  return form;
}

// The construct the form would send.
function sent(form: HTMLFormElement): FormDataEntryValue | null {
  return new FormData(form).get("constructId");
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
  return page.getByRole("button", {
    name: NEW_CHAT_COPY.chooseConstructButton,
  });
}

describe("use_case_standalone_chat", () => {
  test("the bars step to the next and previous construct and wrap round at either end", async () => {
    const form = await renderPicker();
    const next = page.getByRole("button", {
      name: NEW_CHAT_COPY.nextConstruct,
    });
    const previous = page.getByRole("button", {
      name: NEW_CHAT_COPY.previousConstruct,
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
      .element(page.getByText(NEW_CHAT_COPY.constructPosition(COUNT, COUNT)))
      .toBeVisible();

    await next.click();
    expect(sent(form)).toBe(HIPPY.id);
    await expect.element(page.getByRole("list")).not.toBeInTheDocument();
  });

  test("a construct chosen from the list takes the card's place without moving anything", async () => {
    const form = await renderPicker();
    const top = afterTop();

    await chooseButton().click();
    await expect
      .element(
        page.getByRole("list", { name: NEW_CHAT_COPY.builtInConstructs }),
      )
      .toBeVisible();
    expect(afterTop()).toBe(top);
    await expect
      .element(page.getByRole("button", { name: HIPPY.name }))
      .toHaveFocus();

    await page
      .getByRole("list", { name: NEW_CHAT_COPY.ownConstructs })
      .getByRole("button", { name: OWN.name })
      .click();
    await expect.element(page.getByRole("list")).not.toBeInTheDocument();
    expect(afterTop()).toBe(top);
    expect(sent(form)).toBe(OWN.id);
    await expect.element(chooseButton()).toHaveFocus();

    await page
      .getByRole("button", { name: NEW_CHAT_COPY.nextConstruct })
      .click();
    expect(sent(form)).toBe(HIPPY.id);
  });

  test("the keyboard alone chooses any construct from the list, and Escape keeps the shown one", async () => {
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

  test("a construct restored after a failed start shows first", async () => {
    const form = await renderPicker(OWN.id);

    expect(sent(form)).toBe(OWN.id);
    await expect
      .element(page.getByText(NEW_CHAT_COPY.ownConstructDescription))
      .toBeVisible();
  });
});
