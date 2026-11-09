// The construct picker in Chromium and WebKit, as the new-chat, standalone-chat
// and new-project forms show it. "use_case_standalone_chat" in
// use-cases/chats.md: the picker shows one construct at a time, Vellum first;
// the previous and next bars step through the built-in constructs, then her
// own, and wrap round at either end; the form sends the shown construct as
// constructId, and a construct restored after a failed start shows first.
import { describe, expect, test } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { ConstructPicker } from "@/components/construct-picker.tsx";
import type { OwnConstructChoice } from "@/constructs/construct-store.ts";
import {
  type Construct,
  getConstruct,
  listConstructs,
} from "@/constructs/index.ts";
import { NEW_CHAT_COPY } from "@/ui/copy/chat.ts";
import { CONSTRUCT_DISCOVERY_COPY } from "@/ui/copy/construct-discovery.ts";
import { userConstructIdFixture } from "../../support/id-fixtures.ts";
import { tabForward } from "./keyboard-test-kit.ts";

const BUILT_IN: readonly Construct[] = listConstructs();
const OWN: OwnConstructChoice = { id: userConstructIdFixture(), name: "Pip" };
const COUNT: number = BUILT_IN.length + 1;
const VELLUM = getConstruct("vellum");
const LUMEN = getConstruct("lumen");

// Renders the picker in a form, with her own construct, and returns the form.
async function renderPicker(
  defaultConstructId: Construct["id"] | OwnConstructChoice["id"] = VELLUM.id,
): Promise<HTMLFormElement> {
  const screen = await render(
    <form>
      <ConstructPicker
        defaultConstructId={defaultConstructId}
        userConstructs={[OWN]}
      />
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

describe("use_case_standalone_chat", () => {
  test("the bars step to the next and previous construct and wrap round at either end", async () => {
    const form = await renderPicker();
    const next = page.getByRole("button", {
      name: NEW_CHAT_COPY.nextConstruct,
    });
    const previous = page.getByRole("button", {
      name: NEW_CHAT_COPY.previousConstruct,
    });

    await expect
      .element(page.getByRole("group", { name: NEW_CHAT_COPY.constructLabel }))
      .not.toHaveAttribute("aria-describedby");
    expect(sent(form)).toBe(VELLUM.id);
    const image = form.querySelector("img");
    expect(new URL(image?.src ?? "", globalThis.location.href).pathname).toBe(
      "/constructs/vellum-v1-1024.webp",
    );
    await expect
      .element(page.getByText(CONSTRUCT_DISCOVERY_COPY.vellum.sample))
      .toBeVisible();
    await expect.element(page.getByText(VELLUM.description)).toBeVisible();
    await next.click();
    expect(sent(form)).toBe(LUMEN.id);
    await expect.element(page.getByText(LUMEN.description)).toBeVisible();

    await previous.click();
    await previous.click();
    expect(sent(form)).toBe(OWN.id);
    expect(form.querySelector("img")).toBeNull();
    await expect.element(page.getByText("P", { exact: true })).toBeVisible();
    await expect
      .element(page.getByText(NEW_CHAT_COPY.constructPosition(COUNT, COUNT)))
      .toBeVisible();

    await next.click();
    expect(sent(form)).toBe(VELLUM.id);
    await expect.element(page.getByRole("list")).not.toBeInTheDocument();
  });

  test("the keyboard steps through constructs with the bars", async () => {
    const form = await renderPicker();
    const previous = page.getByRole("button", {
      name: NEW_CHAT_COPY.previousConstruct,
    });
    await tabForward();
    await expect.element(previous).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(sent(form)).toBe(OWN.id);

    await tabForward();
    await expect
      .element(page.getByRole("button", { name: NEW_CHAT_COPY.nextConstruct }))
      .toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(sent(form)).toBe(VELLUM.id);
  });

  test("a construct restored after a failed start shows first", async () => {
    const form = await renderPicker(OWN.id);

    expect(sent(form)).toBe(OWN.id);
    await expect
      .element(page.getByText(NEW_CHAT_COPY.ownConstructDescription))
      .toBeVisible();
  });
});

test("own choices use their saved art without guessing from their name", async () => {
  const screen = await render(
    <ConstructPicker
      defaultConstructId={OWN.id}
      userConstructs={[
        { ...OWN, name: "Lumen", visual: VELLUM.definition.visual },
      ]}
    />,
  );
  const image = screen.container.querySelector("img");
  expect(new URL(image?.src ?? "", globalThis.location.href).pathname).toBe(
    "/constructs/vellum-v1-1024.webp",
  );
  await expect.element(page.getByText("Lumen", { exact: true })).toBeVisible();
  await expect
    .element(page.getByText(CONSTRUCT_DISCOVERY_COPY.own.sample))
    .toBeVisible();
});
