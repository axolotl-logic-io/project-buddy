// "use_case_content_stays_still" in use-cases/access.md, in Chromium and
// WebKit: a notice takes the room of the content it replaces, and what
// follows the slot stays put as the notice comes and goes.

import { describe, expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { SlotPart } from "./notice-slot-test-kit.tsx";

const SAVED = "Saved.";
const AFTER_SLOT = "After the slot";

function afterTop(): number {
  return page
    .getByText(AFTER_SLOT, { exact: true })
    .element()
    .getBoundingClientRect().top;
}

describe("use_case_content_stays_still", () => {
  test("a notice taking the place of a form that closes moves nothing after it", async () => {
    const screen = await render(
      <SlotPart after={AFTER_SLOT} form={true} status={undefined} />,
    );
    const top = afterTop();

    await screen.rerender(
      <SlotPart after={AFTER_SLOT} form={false} status={SAVED} />,
    );

    await expect.element(page.getByRole("status")).toHaveTextContent(SAVED);
    expect(afterTop()).toBe(top);
  });

  test("a notice that goes away keeps its room", async () => {
    const screen = await render(
      <SlotPart after={AFTER_SLOT} form={false} status={SAVED} />,
    );
    const top = afterTop();

    await screen.rerender(
      <SlotPart after={AFTER_SLOT} form={false} status={undefined} />,
    );

    await expect.element(page.getByRole("status")).toBeEmptyDOMElement();
    expect(afterTop()).toBe(top);
  });

  test("content the user asks for, such as a search's matches, takes only the room it needs", async () => {
    const screen = await render(
      <SlotPart after={AFTER_SLOT} form={true} status={undefined} fresh="" />,
    );
    const top = afterTop();

    await screen.rerender(
      <SlotPart after={AFTER_SLOT} form={false} status={undefined} fresh="b" />,
    );

    await expect.poll(afterTop).toBeLessThan(top);
  });
});
