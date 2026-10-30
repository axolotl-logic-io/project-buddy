import { expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { ChatError } from "@/components/chat/chat-error.tsx";
import { Alert } from "@/components/ui/form-message.tsx";
import { DEFAULT_THEME_CHOICE } from "@/themes/themes.ts";
import { applyTheme } from "../../themes/theme-test-kit.ts";

const INLINE_FAILURE = "Inline failure";

test("a failed reply stands apart from an inline alert", async () => {
  applyTheme(DEFAULT_THEME_CHOICE.theme);
  const view = await render(
    <>
      <ChatError error={new Error("overloaded")} />
      <Alert>{INLINE_FAILURE}</Alert>
    </>,
  );
  const [boxed, inline] = view.container.querySelectorAll('[role="alert"]');
  if (boxed === undefined || inline === undefined) {
    throw new Error("Both alerts must show");
  }
  const box = getComputedStyle(boxed);
  const line = getComputedStyle(inline);
  expect(Number.parseFloat(box.borderTopWidth)).toBeGreaterThan(
    Number.parseFloat(line.borderTopWidth),
  );
  expect(Number.parseFloat(box.paddingTop)).toBeGreaterThan(
    Number.parseFloat(line.paddingTop),
  );
});
