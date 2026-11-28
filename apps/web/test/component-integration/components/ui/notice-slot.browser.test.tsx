// "use_case_content_stays_still" in use-cases/access.md, in Chromium and
// WebKit: a notice takes the room of the content it replaces, and what
// follows the slot stays put as the notice comes and goes.

import { describe, expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { FormStatus } from "@/components/ui/form-message.tsx";
import { NoticeSlot } from "@/components/ui/notice-slot.tsx";

const FORM_HEIGHT = 120;
const SAVED = "Saved.";

function Part({
  form,
  status,
  fresh,
}: {
  readonly form: boolean;
  readonly status: string | undefined;
  readonly fresh?: string;
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-3">
      <NoticeSlot fresh={fresh}>
        {form && <div style={{ blockSize: FORM_HEIGHT }}>Amount</div>}
        <FormStatus>{status}</FormStatus>
      </NoticeSlot>
      <p>After the slot</p>
    </div>
  );
}

function afterTop(): number {
  return page
    .getByText("After the slot", { exact: true })
    .element()
    .getBoundingClientRect().top;
}

describe("use_case_content_stays_still", () => {
  test("a notice taking the place of a form that closes moves nothing after it", async () => {
    const screen = await render(<Part form={true} status={undefined} />);
    const top = afterTop();

    await screen.rerender(<Part form={false} status={SAVED} />);

    await expect.element(page.getByRole("status")).toHaveTextContent(SAVED);
    expect(afterTop()).toBe(top);
  });

  test("a notice that goes away keeps its room", async () => {
    const screen = await render(<Part form={false} status={SAVED} />);
    const top = afterTop();

    await screen.rerender(<Part form={false} status={undefined} />);

    await expect.element(page.getByRole("status")).toBeEmptyDOMElement();
    expect(afterTop()).toBe(top);
  });

  test("content the user asks for, such as a search's matches, takes only the room it needs", async () => {
    const screen = await render(
      <Part form={true} status={undefined} fresh="" />,
    );
    const top = afterTop();

    await screen.rerender(<Part form={false} status={undefined} fresh="b" />);

    await expect.poll(afterTop).toBeLessThan(top);
  });
});
